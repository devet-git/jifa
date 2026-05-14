package handlers

import (
	"fmt"
	"net/http"
	"time"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ActivityHandler struct{ db *gorm.DB }

func NewActivityHandler(db *gorm.DB) *ActivityHandler { return &ActivityHandler{db: db} }

func (h *ActivityHandler) List(c *gin.Context) {
	var entries []models.IssueActivity
	h.db.Preload("User").
		Where("issue_id = ?", c.Param("id")).
		Order("created_at DESC").
		Find(&entries)
	c.JSON(http.StatusOK, entries)
}

// logActivity inserts an activity row. It silently ignores empty diffs and
// failures (the caller is in the middle of a user-facing mutation).
func logActivity(db *gorm.DB, issueID, userID uint, field string, oldValue, newValue any) {
	o := stringify(oldValue)
	n := stringify(newValue)
	if o == n {
		return
	}
	_ = db.Create(&models.IssueActivity{
		IssueID:  issueID,
		UserID:   userID,
		Field:    field,
		OldValue: o,
		NewValue: n,
	}).Error
}

func stringify(v any) string {
	if v == nil {
		return ""
	}
	switch x := v.(type) {
	case string:
		return x
	case *string:
		if x == nil {
			return ""
		}
		return *x
	case *uint:
		if x == nil {
			return ""
		}
		return fmt.Sprintf("%d", *x)
	case *int:
		if x == nil {
			return ""
		}
		return fmt.Sprintf("%d", *x)
	case *time.Time:
		if x == nil {
			return ""
		}
		return x.UTC().Format(time.RFC3339)
	case time.Time:
		return x.UTC().Format(time.RFC3339)
	default:
		return fmt.Sprintf("%v", v)
	}
}
