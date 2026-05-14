package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RecentHandler struct{ db *gorm.DB }

func NewRecentHandler(db *gorm.DB) *RecentHandler { return &RecentHandler{db: db} }

// List returns the issues the current user has most recently opened. Joins
// against issues + projects so the payload carries enough context to render
// the link directly.
func (h *RecentHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	limit := 10
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}

	var views []models.RecentView
	h.db.Where("user_id = ?", userID).
		Order("updated_at DESC").
		Limit(limit).
		Find(&views)
	if len(views) == 0 {
		c.JSON(http.StatusOK, []models.Issue{})
		return
	}
	ids := make([]uint, len(views))
	for i, v := range views {
		ids[i] = v.IssueID
	}

	var issues []models.Issue
	h.db.Preload("Project").Preload("Assignee").
		Where("id IN ?", ids).Find(&issues)

	// Order issues to match the recent-view order.
	byID := map[uint]models.Issue{}
	for _, i := range issues {
		byID[i.ID] = i
	}
	out := make([]models.Issue, 0, len(views))
	for _, v := range views {
		if iss, ok := byID[v.IssueID]; ok {
			setIssueKey(&iss)
			out = append(out, iss)
		}
	}
	c.JSON(http.StatusOK, out)
}
