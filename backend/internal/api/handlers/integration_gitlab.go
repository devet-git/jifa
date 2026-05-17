package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"jifa/backend/internal/gitlab"
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GitLabHandler struct {
	db *gorm.DB
}

func NewGitLabHandler(db *gorm.DB) *GitLabHandler {
	return &GitLabHandler{db: db}
}

type gitlabResponse struct {
	ID                  uint       `json:"id"`
	ProjectID           uint       `json:"project_id"`
	Enabled             bool       `json:"enabled"`
	BaseURL             string     `json:"base_url"`
	RepoPath            string     `json:"repo_path"`
	RepoID              int        `json:"repo_id"`
	OnMROpenedStatusKey string     `json:"on_mr_opened_status_key"`
	OnMRMergedStatusKey string     `json:"on_mr_merged_status_key"`
	OnMRClosedStatusKey string     `json:"on_mr_closed_status_key"`
	LastPingAt          *time.Time `json:"last_ping_at,omitempty"`
	WebhookURL          string     `json:"webhook_url"`
	HasToken            bool       `json:"has_token"`

	// Returned only on first create and on rotate.
	WebhookSecret string `json:"webhook_secret,omitempty"`
}

type gitlabDTO struct {
	Enabled             *bool  `json:"enabled"`
	BaseURL             string `json:"base_url"`
	RepoPath            string `json:"repo_path"`
	AccessToken         string `json:"access_token"`
	OnMROpenedStatusKey string `json:"on_mr_opened_status_key"`
	OnMRMergedStatusKey string `json:"on_mr_merged_status_key"`
	OnMRClosedStatusKey string `json:"on_mr_closed_status_key"`
}

func (h *GitLabHandler) Get(c *gin.Context) {
	projectID := parseUintParam(c, "projectId")
	var integ models.GitLabIntegration
	err := h.db.Where("project_id = ?", projectID).First(&integ).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusOK, gin.H{"configured": false})
		return
	}
	if err != nil {
		respondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, h.toResponse(c, &integ, ""))
}

func (h *GitLabHandler) Upsert(c *gin.Context) {
	projectID := parseUintParam(c, "projectId")
	var dto gitlabDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateGitLabDTO(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !gitlab.IntegrationKeyConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "JIFA_INTEGRATION_KEY is not configured on the server; cannot store credentials",
		})
		return
	}

	// Use Unscoped to surface soft-deleted rows — the unique index on
	// project_id treats them as present and would reject a new Create.
	var integ models.GitLabIntegration
	err := h.db.Unscoped().Where("project_id = ?", projectID).First(&integ).Error
	isNew := errors.Is(err, gorm.ErrRecordNotFound)
	if err != nil && !isNew {
		respondInternal(c, err)
		return
	}
	if !isNew && integ.DeletedAt.Valid {
		integ.DeletedAt.Valid = false
	}

	if isNew && strings.TrimSpace(dto.AccessToken) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "access_token is required on first save"})
		return
	}

	rawToken := strings.TrimSpace(dto.AccessToken)
	if rawToken != "" {
		cipher, nonce, err := gitlab.EncryptToken(rawToken)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encrypt token: " + err.Error()})
			return
		}
		integ.AccessTokenCipher = cipher
		integ.AccessTokenNonce = nonce
	}

	var fullToken string
	if rawToken != "" {
		fullToken = rawToken
	} else {
		fullToken, err = gitlab.DecryptToken(integ.AccessTokenCipher, integ.AccessTokenNonce)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "stored token unreadable: " + err.Error()})
			return
		}
	}
	if isNew {
		secret, err := gitlab.RandomSecret()
		if err != nil {
			respondInternal(c, err)
			return
		}
		integ.WebhookSecret = secret
		integ.ProjectID = projectID
	}

	// Resolve numeric RepoID and validate the token in one call.
	client := gitlab.NewClient(dto.BaseURL, fullToken)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	proj, err := client.GetProjectByPath(ctx, dto.RepoPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "could not resolve repo on GitLab (check URL, path, and token scopes): " + err.Error(),
		})
		return
	}

	integ.BaseURL = strings.TrimRight(dto.BaseURL, "/")
	integ.RepoPath = strings.TrimSpace(dto.RepoPath)
	integ.RepoID = proj.ID
	integ.OnMROpenedStatusKey = dto.OnMROpenedStatusKey
	integ.OnMRMergedStatusKey = dto.OnMRMergedStatusKey
	integ.OnMRClosedStatusKey = dto.OnMRClosedStatusKey
	if dto.Enabled != nil {
		integ.Enabled = *dto.Enabled
	} else if isNew {
		integ.Enabled = true
	}

	if isNew {
		if err := h.db.Create(&integ).Error; err != nil {
			respondInternal(c, err)
			return
		}
	} else {
		// Map-based Updates so empty strings (NoChange) actually persist —
		// Save() with the struct skips zero values on fields tagged default:''.
		updates := map[string]any{
			"base_url":                integ.BaseURL,
			"repo_path":               integ.RepoPath,
			"repo_id":                 integ.RepoID,
			"on_mr_opened_status_key": dto.OnMROpenedStatusKey,
			"on_mr_merged_status_key": dto.OnMRMergedStatusKey,
			"on_mr_closed_status_key": dto.OnMRClosedStatusKey,
			"enabled":                 integ.Enabled,
			"deleted_at":              nil,
		}
		if rawToken != "" {
			updates["access_token_cipher"] = integ.AccessTokenCipher
			updates["access_token_nonce"] = integ.AccessTokenNonce
		}
		if err := h.db.Unscoped().Model(&integ).Updates(updates).Error; err != nil {
			respondInternal(c, err)
			return
		}
		h.db.First(&integ, integ.ID)
	}

	actorID, _ := c.Get("userID")
	action := "gitlab_integration.updated"
	if isNew {
		action = "gitlab_integration.created"
	}
	LogAudit(h.db, integ.ProjectID, actorID.(uint), action, "gitlab_integration", integ.ID, integ.RepoPath)

	resp := h.toResponse(c, &integ, "")
	if isNew {
		resp.WebhookSecret = integ.WebhookSecret
	}
	c.JSON(http.StatusOK, resp)
}

// Disconnect hard-deletes the integration. IssueExternalRef rows are
// preserved. Use SetEnabled to pause without losing config.
func (h *GitLabHandler) Disconnect(c *gin.Context) {
	projectID := parseUintParam(c, "projectId")
	var integ models.GitLabIntegration
	if err := h.db.Where("project_id = ?", projectID).First(&integ).Error; err != nil {
		c.Status(http.StatusNoContent)
		return
	}
	// Unscoped so the unique (project_id) index frees up for future reconnect.
	if err := h.db.Unscoped().Delete(&integ).Error; err != nil {
		respondInternal(c, err)
		return
	}
	actorID, _ := c.Get("userID")
	LogAudit(h.db, projectID, actorID.(uint), "gitlab_integration.deleted", "gitlab_integration", integ.ID, integ.RepoPath)
	c.Status(http.StatusNoContent)
}

// SetEnabled pauses/resumes the integration without destroying config.
// When disabled: inbound webhook 404s, outbound API calls refuse, the
// Development tab on issues stays hidden.
func (h *GitLabHandler) SetEnabled(c *gin.Context) {
	projectID := parseUintParam(c, "projectId")
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var integ models.GitLabIntegration
	if err := h.db.Where("project_id = ?", projectID).First(&integ).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "integration not configured"})
		return
	}
	if err := h.db.Model(&integ).Update("enabled", body.Enabled).Error; err != nil {
		respondInternal(c, err)
		return
	}
	actorID, _ := c.Get("userID")
	action := "gitlab_integration.disabled"
	if body.Enabled {
		action = "gitlab_integration.enabled"
	}
	LogAudit(h.db, projectID, actorID.(uint), action, "gitlab_integration", integ.ID, integ.RepoPath)
	h.db.First(&integ, integ.ID)
	c.JSON(http.StatusOK, h.toResponse(c, &integ, ""))
}

func (h *GitLabHandler) RevealSecret(c *gin.Context) {
	projectID := parseUintParam(c, "projectId")
	var integ models.GitLabIntegration
	if err := h.db.Where("project_id = ?", projectID).First(&integ).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "integration not configured"})
		return
	}
	actorID, _ := c.Get("userID")
	LogAudit(h.db, projectID, actorID.(uint), "gitlab_integration.secret_revealed", "gitlab_integration", integ.ID, "")
	c.JSON(http.StatusOK, gin.H{"webhook_secret": integ.WebhookSecret})
}

func (h *GitLabHandler) RotateSecret(c *gin.Context) {
	projectID := parseUintParam(c, "projectId")
	var integ models.GitLabIntegration
	if err := h.db.Where("project_id = ?", projectID).First(&integ).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "integration not configured"})
		return
	}
	secret, err := gitlab.RandomSecret()
	if err != nil {
		respondInternal(c, err)
		return
	}
	if err := h.db.Model(&integ).Update("webhook_secret", secret).Error; err != nil {
		respondInternal(c, err)
		return
	}
	actorID, _ := c.Get("userID")
	LogAudit(h.db, projectID, actorID.(uint), "gitlab_integration.secret_rotated", "gitlab_integration", integ.ID, "")
	c.JSON(http.StatusOK, gin.H{"webhook_secret": secret})
}

func (h *GitLabHandler) Test(c *gin.Context) {
	projectID := parseUintParam(c, "projectId")
	var integ models.GitLabIntegration
	if err := h.db.Where("project_id = ?", projectID).First(&integ).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "integration not configured"})
		return
	}
	token, err := gitlab.DecryptToken(integ.AccessTokenCipher, integ.AccessTokenNonce)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "stored token unreadable"})
		return
	}
	client := gitlab.NewClient(integ.BaseURL, token)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	name, err := client.Ping(ctx)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "user": name})
}

func (h *GitLabHandler) toResponse(c *gin.Context, integ *models.GitLabIntegration, basePath string) gitlabResponse {
	scheme := "https"
	if c.Request.TLS == nil && !strings.HasPrefix(c.Request.Host, "localhost") &&
		!strings.HasPrefix(c.Request.Host, "127.0.0.1") {
		scheme = "https"
	} else if c.Request.TLS == nil {
		scheme = "http"
	}
	host := c.Request.Host
	webhookURL := scheme + "://" + host + basePath + "/api/v1/gitlab/webhook/" + strconv.FormatUint(uint64(integ.ProjectID), 10)
	return gitlabResponse{
		ID:                  integ.ID,
		ProjectID:           integ.ProjectID,
		Enabled:             integ.Enabled,
		BaseURL:             integ.BaseURL,
		RepoPath:            integ.RepoPath,
		RepoID:              integ.RepoID,
		OnMROpenedStatusKey: integ.OnMROpenedStatusKey,
		OnMRMergedStatusKey: integ.OnMRMergedStatusKey,
		OnMRClosedStatusKey: integ.OnMRClosedStatusKey,
		LastPingAt:          integ.LastPingAt,
		WebhookURL:          webhookURL,
		HasToken:            integ.AccessTokenCipher != "",
	}
}

func validateGitLabDTO(dto *gitlabDTO) error {
	if dto.BaseURL == "" {
		return errors.New("base_url is required")
	}
	u, err := url.Parse(dto.BaseURL)
	if err != nil {
		return errors.New("base_url is not a valid URL")
	}
	if u.Scheme != "https" {
		if u.Scheme != "http" || (u.Hostname() != "localhost" && u.Hostname() != "127.0.0.1") {
			return errors.New("base_url must use https (http allowed only for localhost)")
		}
	}
	if dto.RepoPath == "" || !strings.Contains(dto.RepoPath, "/") {
		return errors.New("repo_path is required in 'namespace/project' form")
	}
	return nil
}

func parseUintParam(c *gin.Context, name string) uint {
	v, _ := strconv.ParseUint(c.Param(name), 10, 64)
	return uint(v)
}
