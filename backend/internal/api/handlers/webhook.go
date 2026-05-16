package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WebhookHandler struct{ db *gorm.DB }

func NewWebhookHandler(db *gorm.DB) *WebhookHandler { return &WebhookHandler{db: db} }

type webhookDTO struct {
	Name            string                `json:"name"`
	URL             string                `json:"url" binding:"required,url"`
	Events          []models.WebhookEvent `json:"events" binding:"required,min=1"`
	Active          *bool                 `json:"active"`
	Method          string                `json:"method"`
	ContentType     string                `json:"content_type"`
	Headers         map[string]string     `json:"headers"`
	QueryParams     map[string]string     `json:"query_params"`
	AuthType        models.AuthType       `json:"auth_type"`
	AuthCredentials string                `json:"auth_credentials"`
	BodyType        string                `json:"body_type"`
	BodyTemplate    string                `json:"body_template"`
	FormFields      map[string]string     `json:"form_fields"`
}

type webhookResponse struct {
	models.Webhook
	EventsList     []models.WebhookEvent `json:"events_list"`
	HeadersMap     map[string]string     `json:"headers_map"`
	QueryParams    map[string]string     `json:"query_params_map"`
	FormFieldsMap  map[string]string     `json:"form_fields_map"`
	// Secret is returned only on create; subsequent reads will leave it empty.
	Secret string `json:"secret,omitempty"`
}

func (h *WebhookHandler) List(c *gin.Context) {
	var hooks []models.Webhook
	h.db.Where("project_id = ?", c.Param("projectId")).
		Order("created_at DESC").Find(&hooks)
	out := make([]webhookResponse, len(hooks))
	for i, hk := range hooks {
		out[i] = webhookResponse{
			Webhook:       hk,
			EventsList:    splitEvents(hk.Events),
			HeadersMap:    decodeStringMap(hk.Headers),
			QueryParams:   decodeStringMap(hk.QueryParams),
			FormFieldsMap: decodeStringMap(hk.FormFields),
		}
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
	if err := validateWebhookDTO(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	secret, err := randomSecret()
	if err != nil {
		respondInternal(c, err)
		return
	}
	active := true
	if dto.Active != nil {
		active = *dto.Active
	}
	hk := models.Webhook{
		ProjectID:       uint(pid),
		Name:            strings.TrimSpace(dto.Name),
		URL:             dto.URL,
		Secret:          secret,
		Events:          joinEvents(dto.Events),
		Active:          active,
		Method:          normaliseMethod(dto.Method),
		ContentType:     normaliseContentType(dto.ContentType),
		Headers:         encodeStringMap(dto.Headers),
		QueryParams:     encodeStringMap(dto.QueryParams),
		AuthType:        normaliseAuthType(dto.AuthType),
		AuthCredentials: dto.AuthCredentials,
		BodyType:        normaliseBodyType(dto.BodyType),
		BodyTemplate:    dto.BodyTemplate,
		FormFields:      encodeStringMap(dto.FormFields),
	}
	if err := h.db.Create(&hk).Error; err != nil {
		respondInternal(c, err)
		return
	}
	actorID, _ := c.Get("userID")
	LogAudit(h.db, hk.ProjectID, actorID.(uint), "webhook.created", "webhook", hk.ID, hk.URL)
	c.JSON(http.StatusCreated, webhookResponse{
		Webhook:       hk,
		EventsList:    dto.Events,
		HeadersMap:    dto.Headers,
		QueryParams:   dto.QueryParams,
		FormFieldsMap: dto.FormFields,
		Secret:        secret, // shown once
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
	if err := validateWebhookDTO(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hk.Name = strings.TrimSpace(dto.Name)
	hk.URL = dto.URL
	hk.Events = joinEvents(dto.Events)
	if dto.Active != nil {
		hk.Active = *dto.Active
	}
	hk.Method = normaliseMethod(dto.Method)
	hk.ContentType = normaliseContentType(dto.ContentType)
	hk.Headers = encodeStringMap(dto.Headers)
	hk.QueryParams = encodeStringMap(dto.QueryParams)
	hk.AuthType = normaliseAuthType(dto.AuthType)
	// Preserve previously saved credentials when the form sends an empty string
	// (UI hides the field after save so users don't accidentally wipe secrets).
	if strings.TrimSpace(dto.AuthCredentials) != "" {
		hk.AuthCredentials = dto.AuthCredentials
	}
	hk.BodyType = normaliseBodyType(dto.BodyType)
	hk.BodyTemplate = dto.BodyTemplate
	hk.FormFields = encodeStringMap(dto.FormFields)
	h.db.Save(&hk)
	c.JSON(http.StatusOK, webhookResponse{
		Webhook:       hk,
		EventsList:    dto.Events,
		HeadersMap:    dto.Headers,
		QueryParams:   dto.QueryParams,
		FormFieldsMap: dto.FormFields,
	})
}

func (h *WebhookHandler) Delete(c *gin.Context) {
	h.db.Where("project_id = ?", c.Param("projectId")).
		Delete(&models.Webhook{}, c.Param("webhookId"))
	c.Status(http.StatusNoContent)
}

// Test fires a sample payload at the configured endpoint and returns the
// response. Useful in the UI to verify a webhook works before relying on it.
func (h *WebhookHandler) Test(c *gin.Context) {
	var hk models.Webhook
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&hk, c.Param("webhookId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook not found"})
		return
	}
	_, result, _ := webhook.Deliver(hk, models.EventIssueCreated, hk.ProjectID, sampleTestPayload())
	c.JSON(http.StatusOK, result)
}

// TestDraft builds an in-memory webhook from the request body and dispatches a
// sample payload — no DB write. Lets users verify their configuration before
// committing it.
func (h *WebhookHandler) TestDraft(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var dto webhookDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateWebhookDTO(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hk := models.Webhook{
		ProjectID:       uint(pid),
		Name:            strings.TrimSpace(dto.Name),
		URL:             dto.URL,
		Method:          normaliseMethod(dto.Method),
		ContentType:     normaliseContentType(dto.ContentType),
		Headers:         encodeStringMap(dto.Headers),
		QueryParams:     encodeStringMap(dto.QueryParams),
		AuthType:        normaliseAuthType(dto.AuthType),
		AuthCredentials: dto.AuthCredentials,
		BodyType:        normaliseBodyType(dto.BodyType),
		BodyTemplate:    dto.BodyTemplate,
		FormFields:      encodeStringMap(dto.FormFields),
		Events:          joinEvents(dto.Events),
		Active:          true,
	}
	_, result, _ := webhook.Deliver(hk, models.EventIssueCreated, hk.ProjectID, sampleTestPayload())
	c.JSON(http.StatusOK, result)
}

func sampleTestPayload() map[string]any {
	return map[string]any{
		"sample": true,
		"issue": map[string]any{
			"id":       42,
			"key":      "TEST-42",
			"title":    "Sample issue for webhook test",
			"status":   "open",
			"priority": "medium",
		},
	}
}

func validateWebhookDTO(dto *webhookDTO) error {
	if err := validateEvents(dto.Events); err != nil {
		return err
	}
	switch normaliseBodyType(dto.BodyType) {
	case "form":
		if len(dto.FormFields) == 0 {
			return errString("form_fields must have at least one entry when body_type is 'form'")
		}
	default:
		if strings.TrimSpace(dto.BodyTemplate) == "" {
			return errString("body_template is required")
		}
	}
	switch normaliseAuthType(dto.AuthType) {
	case models.AuthNone, models.AuthBasic, models.AuthBearer, models.AuthHeader:
		// ok
	default:
		return errString("unknown auth_type")
	}
	return nil
}

func normaliseBodyType(t string) string {
	switch strings.ToLower(strings.TrimSpace(t)) {
	case "form":
		return "form"
	default:
		return "template"
	}
}

func validateEvents(events []models.WebhookEvent) error {
	known := map[models.WebhookEvent]bool{}
	for _, e := range models.AllWebhookEvents {
		known[e] = true
	}
	for _, e := range events {
		if !known[e] {
			return errString("unknown event: " + string(e))
		}
	}
	return nil
}

func normaliseMethod(m string) string {
	m = strings.ToUpper(strings.TrimSpace(m))
	switch m {
	case "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD":
		return m
	}
	return "POST"
}

func normaliseContentType(ct string) string {
	ct = strings.TrimSpace(ct)
	if ct == "" {
		return "application/json"
	}
	return ct
}

func normaliseAuthType(t models.AuthType) models.AuthType {
	switch t {
	case models.AuthBasic, models.AuthBearer, models.AuthHeader, models.AuthNone:
		return t
	}
	return models.AuthNone
}

func encodeStringMap(m map[string]string) string {
	if len(m) == 0 {
		return ""
	}
	b, _ := json.Marshal(m)
	return string(b)
}

func decodeStringMap(s string) map[string]string {
	s = strings.TrimSpace(s)
	if s == "" {
		return map[string]string{}
	}
	var m map[string]string
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		return map[string]string{}
	}
	return m
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
