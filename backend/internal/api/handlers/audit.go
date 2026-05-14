package handlers

import (
	"encoding/csv"
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

func (h *AuditHandler) ExportCSV(c *gin.Context) {
	var entries []models.AuditLog
	q := h.db.Preload("Actor").
		Where("project_id = ?", c.Param("projectId")).
		Order("created_at DESC")
	if from := c.Query("from"); from != "" {
		q = q.Where("created_at >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		q = q.Where("created_at <= ?", to)
	}
	q.Limit(10000).Find(&entries)

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", `attachment; filename="audit-log.csv"`)

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"Timestamp", "Actor", "Action", "TargetType", "TargetID", "Details"})
	for _, e := range entries {
		actor := ""
		if e.Actor != nil {
			actor = e.Actor.Name
		}
		_ = w.Write([]string{
			e.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
			actor,
			e.Action,
			e.TargetType,
			strconv.FormatUint(uint64(e.TargetID), 10),
			e.Details,
		})
	}
	w.Flush()
}
