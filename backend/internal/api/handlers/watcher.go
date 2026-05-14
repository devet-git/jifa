package handlers

import (
	"errors"
	"net/http"

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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
	err := db.Where("issue_id = ? AND user_id = ?", issueID, userID).
		First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return db.Create(&models.IssueWatcher{IssueID: issueID, UserID: userID}).Error
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
