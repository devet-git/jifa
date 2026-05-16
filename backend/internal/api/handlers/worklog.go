package handlers

import (
	"net/http"
	"time"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WorklogHandler struct{ db *gorm.DB }

func NewWorklogHandler(db *gorm.DB) *WorklogHandler { return &WorklogHandler{db: db} }

type worklogDTO struct {
	Minutes     int       `json:"minutes" binding:"required,min=1"`
	StartedAt   time.Time `json:"started_at"`
	Description string    `json:"description"`
}

func (h *WorklogHandler) List(c *gin.Context) {
	var logs []models.Worklog
	h.db.Preload("User").
		Where("issue_id = ?", c.Param("id")).
		Order("started_at DESC").
		Find(&logs)
	c.JSON(http.StatusOK, logs)
}

func (h *WorklogHandler) Create(c *gin.Context) {
	userID, _ := c.Get("userID")
	issueID := parseParamUint(c, "id")
	if issueID == 0 {
		return
	}
	var dto worklogDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if dto.StartedAt.IsZero() {
		dto.StartedAt = time.Now()
	}
	wl := models.Worklog{
		IssueID:     issueID,
		UserID:      userID.(uint),
		Minutes:     dto.Minutes,
		StartedAt:   dto.StartedAt,
		Description: dto.Description,
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&wl).Error; err != nil {
			return err
		}
		return tx.Model(&models.Issue{}).Where("id = ?", issueID).
			UpdateColumn("time_spent", gorm.Expr("time_spent + ?", dto.Minutes)).Error
	})
	if err != nil {
		respondInternal(c, err)
		return
	}
	h.db.Preload("User").First(&wl, wl.ID)
	if pid := projectIDForIssue(h.db, wl.IssueID); pid != 0 {
		webhook.Dispatch(h.db, pid, models.EventWorklogAdded, wl)
	}
	c.JSON(http.StatusCreated, wl)
}

func (h *WorklogHandler) Update(c *gin.Context) {
	userID, _ := c.Get("userID")
	var wl models.Worklog
	if err := h.db.Where("issue_id = ?", c.Param("id")).
		First(&wl, c.Param("worklogId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "worklog not found"})
		return
	}
	if wl.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your worklog"})
		return
	}
	var dto worklogDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	delta := dto.Minutes - wl.Minutes
	err := h.db.Transaction(func(tx *gorm.DB) error {
		wl.Minutes = dto.Minutes
		if !dto.StartedAt.IsZero() {
			wl.StartedAt = dto.StartedAt
		}
		wl.Description = dto.Description
		if err := tx.Save(&wl).Error; err != nil {
			return err
		}
		if delta != 0 {
			return tx.Model(&models.Issue{}).Where("id = ?", wl.IssueID).
				UpdateColumn("time_spent", gorm.Expr("time_spent + ?", delta)).Error
		}
		return nil
	})
	if err != nil {
		respondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, wl)
}

func (h *WorklogHandler) Delete(c *gin.Context) {
	userID, _ := c.Get("userID")
	var wl models.Worklog
	if err := h.db.Where("issue_id = ?", c.Param("id")).
		First(&wl, c.Param("worklogId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "worklog not found"})
		return
	}
	if wl.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your worklog"})
		return
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&wl).Error; err != nil {
			return err
		}
		return tx.Model(&models.Issue{}).Where("id = ?", wl.IssueID).
			UpdateColumn("time_spent", gorm.Expr("time_spent - ?", wl.Minutes)).Error
	})
	if err != nil {
		respondInternal(c, err)
		return
	}
	if pid := projectIDForIssue(h.db, wl.IssueID); pid != 0 {
		webhook.Dispatch(h.db, pid, models.EventWorklogDeleted, gin.H{
			"worklog_id": wl.ID,
			"issue_id":   wl.IssueID,
			"minutes":    wl.Minutes,
		})
	}
	c.Status(http.StatusNoContent)
}
