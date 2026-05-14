package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"strings"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WebhookHandler struct{ db *gorm.DB }

func NewWebhookHandler(db *gorm.DB) *WebhookHandler { return &WebhookHandler{db: db} }

type webhookDTO struct {
	URL    string                `json:"url" binding:"required,url"`
	Events []models.WebhookEvent `json:"events" binding:"required,min=1"`
	Active *bool                 `json:"active"`
}

type webhookResponse struct {
	models.Webhook
	EventsList []models.WebhookEvent `json:"events_list"`
	// Secret is returned only on create; subsequent reads will leave it empty.
	Secret string `json:"secret,omitempty"`
}

func (h *WebhookHandler) List(c *gin.Context) {
	var hooks []models.Webhook
	h.db.Where("project_id = ?", c.Param("projectId")).
		Order("created_at DESC").Find(&hooks)
	out := make([]webhookResponse, len(hooks))
	for i, hk := range hooks {
		out[i] = webhookResponse{Webhook: hk, EventsList: splitEvents(hk.Events)}
	}
	c.JSON(http.StatusOK, out)
}

func (h *WebhookHandler) Create(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var dto webhookDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateEvents(dto.Events); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	secret, err := randomSecret()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	active := true
	if dto.Active != nil {
		active = *dto.Active
	}
	hk := models.Webhook{
		ProjectID: uint(pid),
		URL:       dto.URL,
		Secret:    secret,
		Events:    joinEvents(dto.Events),
		Active:    active,
	}
	if err := h.db.Create(&hk).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	actorID, _ := c.Get("userID")
	LogAudit(h.db, hk.ProjectID, actorID.(uint), "webhook.created", "webhook", hk.ID, hk.URL)
	c.JSON(http.StatusCreated, webhookResponse{
		Webhook:    hk,
		EventsList: dto.Events,
		Secret:     secret, // shown once
	})
}

func (h *WebhookHandler) Update(c *gin.Context) {
	var hk models.Webhook
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&hk, c.Param("webhookId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}
	var dto webhookDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateEvents(dto.Events); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hk.URL = dto.URL
	hk.Events = joinEvents(dto.Events)
	if dto.Active != nil {
		hk.Active = *dto.Active
	}
	h.db.Save(&hk)
	c.JSON(http.StatusOK, webhookResponse{Webhook: hk, EventsList: dto.Events})
}

func (h *WebhookHandler) Delete(c *gin.Context) {
	h.db.Where("project_id = ?", c.Param("projectId")).
		Delete(&models.Webhook{}, c.Param("webhookId"))
	c.Status(http.StatusNoContent)
}

func validateEvents(events []models.WebhookEvent) error {
	known := map[models.WebhookEvent]bool{}
	for _, e := range models.AllWebhookEvents {
		known[e] = true
	}
	for _, e := range events {
		if !known[e] {
			return gin.Error{Err: errString("unknown event: " + string(e))}.Err
		}
	}
	return nil
}

type errString string

func (e errString) Error() string { return string(e) }

func joinEvents(es []models.WebhookEvent) string {
	parts := make([]string, len(es))
	for i, e := range es {
		parts[i] = string(e)
	}
	return strings.Join(parts, ",")
}

func splitEvents(s string) []models.WebhookEvent {
	if s == "" {
		return []models.WebhookEvent{}
	}
	parts := strings.Split(s, ",")
	out := make([]models.WebhookEvent, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, models.WebhookEvent(p))
		}
	}
	return out
}

func randomSecret() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
