package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuditHandler struct{ db *gorm.DB }

func NewAuditHandler(db *gorm.DB) *AuditHandler { return &AuditHandler{db: db} }

func (h *AuditHandler) List(c *gin.Context) {
	limit := 100
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	var entries []models.AuditLog
	h.db.Preload("Actor").
		Where("project_id = ?", c.Param("projectId")).
		Order("created_at DESC").
		Limit(limit).
		Find(&entries)
	c.JSON(http.StatusOK, entries)
}

// LogAudit writes one row. Failures are swallowed — never block the caller's
// operation just to record an audit line.
func LogAudit(db *gorm.DB, projectID, actorID uint, action, targetType string, targetID uint, details string) {
	if projectID == 0 || actorID == 0 || action == "" {
		return
	}
	_ = db.Create(&models.AuditLog{
		ProjectID:  projectID,
		ActorID:    actorID,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Details:    details,
	}).Error
}
