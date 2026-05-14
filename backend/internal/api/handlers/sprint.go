package handlers

import (
	"net/http"
	"strconv"
	"time"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SprintHandler struct{ db *gorm.DB }

func NewSprintHandler(db *gorm.DB) *SprintHandler { return &SprintHandler{db: db} }

func (h *SprintHandler) List(c *gin.Context) {
	var sprints []models.Sprint
	h.db.Where("project_id = ?", c.Param("projectId")).
		Preload("Issues", func(db *gorm.DB) *gorm.DB {
			return db.Order("rank ASC, id ASC")
		}).
		Order("start_date ASC, id ASC").
		Find(&sprints)
	c.JSON(http.StatusOK, sprints)
}

func (h *SprintHandler) Create(c *gin.Context) {
	var sprint models.Sprint
	if err := c.ShouldBindJSON(&sprint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	projectID, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	sprint.ProjectID = uint(projectID)
	if err := h.db.Create(&sprint).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sprint)
}

func (h *SprintHandler) Update(c *gin.Context) {
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sprint not found"})
		return
	}
	c.ShouldBindJSON(&sprint)
	h.db.Save(&sprint)
	c.JSON(http.StatusOK, sprint)
}

func (h *SprintHandler) Start(c *gin.Context) {
	now := time.Now()
	h.db.Model(&models.Sprint{}).Where("id = ?", c.Param("sprintId")).
		Updates(map[string]any{
			"status":     models.SprintActive,
			"start_date": &now,
		})
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err == nil {
		webhook.Dispatch(h.db, sprint.ProjectID, models.EventSprintStarted, sprint)
	}
	c.JSON(http.StatusOK, gin.H{"status": "active"})
}

func (h *SprintHandler) Complete(c *gin.Context) {
	now := time.Now()
	h.db.Model(&models.Sprint{}).Where("id = ?", c.Param("sprintId")).
		Updates(map[string]any{
			"status":       models.SprintComplete,
			"completed_at": &now,
		})
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err == nil {
		webhook.Dispatch(h.db, sprint.ProjectID, models.EventSprintCompleted, sprint)
	}
	c.JSON(http.StatusOK, gin.H{"status": "completed"})
}
