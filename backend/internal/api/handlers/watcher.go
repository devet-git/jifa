package handlers

import (
	"errors"
	"net/http"
	"strings"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WatcherHandler struct{ db *gorm.DB }

func NewWatcherHandler(db *gorm.DB) *WatcherHandler { return &WatcherHandler{db: db} }

func (h *WatcherHandler) List(c *gin.Context) {
	var ws []models.IssueWatcher
	h.db.Preload("User").
		Where("issue_id = ?", c.Param("id")).
		Order("created_at ASC").
		Find(&ws)
	c.JSON(http.StatusOK, ws)
}

// Watch adds the current user as a watcher on the issue. Idempotent.
func (h *WatcherHandler) Watch(c *gin.Context) {
	userID, _ := c.Get("userID")
	issueID := parseParamUint(c, "id")
	if issueID == 0 {
		return
	}
	if err := EnsureWatcher(h.db, issueID, userID.(uint)); err != nil {
		respondInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// Unwatch removes the current user as a watcher. Idempotent.
func (h *WatcherHandler) Unwatch(c *gin.Context) {
	userID, _ := c.Get("userID")
	issueID := parseParamUint(c, "id")
	if issueID == 0 {
		return
	}
	h.db.Where("issue_id = ? AND user_id = ?", issueID, userID).
		Delete(&models.IssueWatcher{})
	c.Status(http.StatusNoContent)
}

// EnsureWatcher inserts a watcher row if not already present.
func EnsureWatcher(db *gorm.DB, issueID, userID uint) error {
	var existing models.IssueWatcher
	err := db.Unscoped().
		Where("issue_id = ? AND user_id = ?", issueID, userID).
		First(&existing).Error
	if err == nil {
		if existing.DeletedAt.Valid {
			// Row exists but was soft-deleted (unwatch → re-watch).
			// Restore by clearing deleted_at.
			return db.Unscoped().Model(&existing).
				UpdateColumn("deleted_at", nil).Error
		}
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	err = db.Create(&models.IssueWatcher{IssueID: issueID, UserID: userID}).Error
	if err != nil && strings.Contains(err.Error(), "idx_watcher_unique") {
		return nil
	}
	return err
}

func parseParamUint(c *gin.Context, key string) uint {
	var n uint
	for _, ch := range c.Param(key) {
		if ch < '0' || ch > '9' {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
			return 0
		}
		n = n*10 + uint(ch-'0')
	}
	return n
}
