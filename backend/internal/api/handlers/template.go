package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TemplateHandler struct{ db *gorm.DB }

func NewTemplateHandler(db *gorm.DB) *TemplateHandler { return &TemplateHandler{db: db} }

type templateDTO struct {
	Name        string               `json:"name" binding:"required,max=120"`
	IssueType   models.IssueType     `json:"issue_type"`
	Title       string               `json:"title"`
	Description string               `json:"description"`
	Priority    models.IssuePriority `json:"priority"`
	StoryPoints *int                 `json:"story_points"`
}

func (h *TemplateHandler) List(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var items []models.IssueTemplate
	h.db.Where("project_id = ?", pid).Order("created_at ASC").Find(&items)
	c.JSON(http.StatusOK, items)
}

func (h *TemplateHandler) Create(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var dto templateDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t := models.IssueTemplate{
		ProjectID:   uint(pid),
		Name:        dto.Name,
		IssueType:   dto.IssueType,
		Title:       dto.Title,
		Description: dto.Description,
		Priority:    dto.Priority,
		StoryPoints: dto.StoryPoints,
	}
	if t.IssueType == "" {
		t.IssueType = models.IssueTypeTask
	}
	if t.Priority == "" {
		t.Priority = models.PriorityMedium
	}
	if err := h.db.Create(&t).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *TemplateHandler) Update(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var t models.IssueTemplate
	if err := h.db.Where("id = ? AND project_id = ?", c.Param("templateId"), pid).
		First(&t).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}
	var dto templateDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t.Name = dto.Name
	t.IssueType = dto.IssueType
	t.Title = dto.Title
	t.Description = dto.Description
	t.Priority = dto.Priority
	t.StoryPoints = dto.StoryPoints
	h.db.Save(&t)
	c.JSON(http.StatusOK, t)
}

func (h *TemplateHandler) Delete(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	h.db.Where("id = ? AND project_id = ?", c.Param("templateId"), pid).
		Delete(&models.IssueTemplate{})
	c.Status(http.StatusNoContent)
}
