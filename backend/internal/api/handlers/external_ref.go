package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"jifa/backend/internal/gitlab"
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ExternalRefHandler struct {
	db *gorm.DB
}

func NewExternalRefHandler(db *gorm.DB) *ExternalRefHandler {
	return &ExternalRefHandler{db: db}
}

func (h *ExternalRefHandler) List(c *gin.Context) {
	issueID := parseUintParam(c, "id")
	var refs []models.IssueExternalRef
	if err := h.db.Where("issue_id = ?", issueID).
		Order("ref_type ASC, created_at DESC").
		Find(&refs).Error; err != nil {
		respondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, refs)
}

type externalRefDTO struct {
	URL     string `json:"url" binding:"required"`
	RefType string `json:"ref_type" binding:"required"`
}

var (
	mrURLPattern     = regexp.MustCompile(`^/(.+?)/-/merge_requests/(\d+)/?$`)
	branchURLPattern = regexp.MustCompile(`^/(.+?)/-/tree/([^/]+)/?$`)
	commitURLPattern = regexp.MustCompile(`^/(.+?)/-/commit/([0-9a-f]+)/?$`)
)

func (h *ExternalRefHandler) Create(c *gin.Context) {
	issueID := parseUintParam(c, "id")
	var dto externalRefDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	issue, integ, err := h.loadIssueAndIntegration(issueID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsed, err := url.Parse(strings.TrimSpace(dto.URL))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid URL"})
		return
	}
	if !strings.EqualFold(strings.TrimRight(parsed.Scheme+"://"+parsed.Host, "/"), strings.TrimRight(integ.BaseURL, "/")) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "URL host does not match this project's GitLab base URL",
		})
		return
	}

	var ref models.IssueExternalRef
	ref.IssueID = issue.ID
	ref.Source = models.RefSourceGitLab
	ref.URL = dto.URL

	switch strings.ToLower(dto.RefType) {
	case models.RefTypeMR:
		m := mrURLPattern.FindStringSubmatch(parsed.Path)
		if m == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "URL does not look like a GitLab MR"})
			return
		}
		repoPath, iidStr := m[1], m[2]
		if !sameRepo(repoPath, integ.RepoPath) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "MR is in a different repo than the integration"})
			return
		}
		iid, _ := strconv.Atoi(iidStr)
		token, err := gitlab.DecryptToken(integ.AccessTokenCipher, integ.AccessTokenNonce)
		if err != nil {
			respondInternal(c, err)
			return
		}
		client := gitlab.NewClient(integ.BaseURL, token)
		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()
		mr, err := client.GetMergeRequest(ctx, integ.RepoID, iid)
		if err != nil {
			mapUpstreamError(c, err, "fetch MR")
			return
		}
		ref.RefType = models.RefTypeMR
		ref.ExternalID = strconv.Itoa(mr.IID)
		ref.Title = truncate500(mr.Title)
		ref.URL = mr.WebURL
		ref.State = mr.State
		ref.AuthorName = mr.Author.Name
		t := mr.CreatedAt
		if !t.IsZero() {
			ref.CreatedAtSrc = &t
		}

	case models.RefTypeBranch:
		m := branchURLPattern.FindStringSubmatch(parsed.Path)
		if m == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "URL does not look like a GitLab branch"})
			return
		}
		repoPath, branch := m[1], m[2]
		if !sameRepo(repoPath, integ.RepoPath) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "branch is in a different repo than the integration"})
			return
		}
		decoded, _ := url.PathUnescape(branch)
		ref.RefType = models.RefTypeBranch
		ref.ExternalID = decoded
		ref.Title = decoded
		ref.URL = dto.URL

	case models.RefTypeCommit:
		m := commitURLPattern.FindStringSubmatch(parsed.Path)
		if m == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "URL does not look like a GitLab commit"})
			return
		}
		repoPath, sha := m[1], m[2]
		if !sameRepo(repoPath, integ.RepoPath) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "commit is in a different repo than the integration"})
			return
		}
		ref.RefType = models.RefTypeCommit
		ref.ExternalID = sha
		ref.URL = dto.URL

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "ref_type must be branch, mr, or commit"})
		return
	}

	if err := h.db.Create(&ref).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "this reference is already linked to this issue"})
		return
	}
	c.JSON(http.StatusCreated, ref)
}

func (h *ExternalRefHandler) Delete(c *gin.Context) {
	issueID := parseUintParam(c, "id")
	refID := parseUintParam(c, "refId")
	if err := h.db.Where("issue_id = ?", issueID).
		Delete(&models.IssueExternalRef{}, refID).Error; err != nil {
		respondInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

type createBranchDTO struct {
	BranchName   string `json:"branch_name" binding:"required"`
	SourceBranch string `json:"source_branch" binding:"required"`
}

func (h *ExternalRefHandler) CreateBranch(c *gin.Context) {
	issueID := parseUintParam(c, "id")
	var dto createBranchDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	issue, integ, err := h.loadIssueAndIntegration(issueID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := gitlab.DecryptToken(integ.AccessTokenCipher, integ.AccessTokenNonce)
	if err != nil {
		respondInternal(c, err)
		return
	}
	client := gitlab.NewClient(integ.BaseURL, token)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	br, err := client.CreateBranch(ctx, integ.RepoID, dto.BranchName, dto.SourceBranch)
	if err != nil {
		mapUpstreamError(c, err, "create branch")
		return
	}

	ref := models.IssueExternalRef{
		IssueID:    issue.ID,
		Source:     models.RefSourceGitLab,
		RefType:    models.RefTypeBranch,
		ExternalID: br.Name,
		Title:      br.Name,
		URL:        br.WebURL,
	}
	if err := h.db.Create(&ref).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "branch created on GitLab but already linked here"})
		return
	}
	c.JSON(http.StatusCreated, ref)
}

func (h *ExternalRefHandler) ListBranches(c *gin.Context) {
	issueID := parseUintParam(c, "id")
	_, integ, err := h.loadIssueAndIntegration(issueID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	token, err := gitlab.DecryptToken(integ.AccessTokenCipher, integ.AccessTokenNonce)
	if err != nil {
		respondInternal(c, err)
		return
	}
	client := gitlab.NewClient(integ.BaseURL, token)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	branches, err := client.ListBranches(ctx, integ.RepoID, c.Query("search"), 100)
	if err != nil {
		mapUpstreamError(c, err, "list branches")
		return
	}
	c.JSON(http.StatusOK, branches)
}

func (h *ExternalRefHandler) loadIssueAndIntegration(issueID uint) (*models.Issue, *models.GitLabIntegration, error) {
	var issue models.Issue
	if err := h.db.First(&issue, issueID).Error; err != nil {
		return nil, nil, errors.New("issue not found")
	}
	var integ models.GitLabIntegration
	if err := h.db.Where("project_id = ?", issue.ProjectID).First(&integ).Error; err != nil {
		return nil, nil, errors.New("GitLab integration is not configured for this project")
	}
	if !integ.Enabled {
		return nil, nil, errors.New("GitLab integration is disabled for this project")
	}
	return &issue, &integ, nil
}

func sameRepo(a, b string) bool {
	return strings.EqualFold(strings.Trim(a, "/"), strings.Trim(b, "/"))
}

// mapUpstreamError translates a GitLab API error to a Jifa-facing response.
// Remaps GitLab 401/403 to 424 (Failed Dependency) — propagating raw 401
// would trip the frontend's "JWT expired" interceptor and log the user out.
func mapUpstreamError(c *gin.Context, err error, op string) {
	var apiErr *gitlab.APIError
	if errors.As(err, &apiErr) {
		switch apiErr.Status {
		case http.StatusUnauthorized, http.StatusForbidden:
			c.JSON(http.StatusFailedDependency, gin.H{
				"error":         "GitLab rejected the access token (revoked, expired, or missing scopes). Reconnect the integration in project settings.",
				"upstream_op":   op,
				"upstream_code": apiErr.Status,
			})
			return
		case http.StatusNotFound:
			c.JSON(http.StatusBadRequest, gin.H{
				"error":         "GitLab resource not found",
				"upstream_op":   op,
				"upstream_code": apiErr.Status,
			})
			return
		case http.StatusConflict:
			c.JSON(http.StatusConflict, gin.H{
				"error":         apiErr.Body,
				"upstream_op":   op,
				"upstream_code": apiErr.Status,
			})
			return
		default:
			c.JSON(http.StatusBadGateway, gin.H{
				"error":         "GitLab returned an error",
				"detail":        apiErr.Body,
				"upstream_op":   op,
				"upstream_code": apiErr.Status,
			})
			return
		}
	}
	c.JSON(http.StatusBadGateway, gin.H{
		"error":       "could not reach GitLab",
		"detail":      err.Error(),
		"upstream_op": op,
	})
}

func truncate500(s string) string {
	if len(s) <= 500 {
		return s
	}
	return s[:500]
}
