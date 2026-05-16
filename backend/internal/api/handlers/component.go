package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ComponentHandler struct{ db *gorm.DB }

func NewComponentHandler(db *gorm.DB) *ComponentHandler {
	return &ComponentHandler{db: db}
}

type componentDTO struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	LeadID      *uint  `json:"lead_id"`
}

func (h *ComponentHandler) List(c *gin.Context) {
	var components []models.Component
	h.db.Preload("Lead").
		Where("project_id = ?", c.Param("projectId")).
		Order("name ASC").
		Find(&components)
	c.JSON(http.StatusOK, components)
}

func (h *ComponentHandler) Create(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var dto componentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cmp := models.Component{
		ProjectID:   uint(pid),
		Name:        dto.Name,
		Description: dto.Description,
		LeadID:      dto.LeadID,
	}
	if err := h.db.Create(&cmp).Error; err != nil {
		respondInternal(c, err)
		return
	}
	h.db.Preload("Lead").First(&cmp, cmp.ID)
	c.JSON(http.StatusCreated, cmp)
}

func (h *ComponentHandler) Update(c *gin.Context) {
	var cmp models.Component
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&cmp, c.Param("componentId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "component not found"})
		return
	}
	var dto componentDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cmp.Name = dto.Name
	cmp.Description = dto.Description
	cmp.LeadID = dto.LeadID
	h.db.Save(&cmp)
	h.db.Preload("Lead").First(&cmp, cmp.ID)
	c.JSON(http.StatusOK, cmp)
}

func (h *ComponentHandler) Delete(c *gin.Context) {
	h.db.Where("project_id = ?", c.Param("projectId")).
		Delete(&models.Component{}, c.Param("componentId"))
	c.Status(http.StatusNoContent)
}

func (h *ComponentHandler) Reorder(c *gin.Context) {
	var req struct {
		IDs []uint `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pid := c.Param("projectId")
	for rank, id := range req.IDs {
		h.db.Model(&models.Component{}).
			Where("id = ? AND project_id = ?", id, pid).
			Update("rank", rank)
	}
	c.Status(http.StatusNoContent)
}

// SetIssueComponents replaces the components on an issue.
func (h *ComponentHandler) SetIssueComponents(c *gin.Context) {
	var issue models.Issue
	if err := h.db.First(&issue, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}
	var body struct {
		ComponentIDs []uint `json:"component_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var components []models.Component
	if len(body.ComponentIDs) > 0 {
		h.db.Where("project_id = ?", issue.ProjectID).
			Find(&components, body.ComponentIDs)
	}
	if err := h.db.Model(&issue).Association("Components").Replace(components); err != nil {
		respondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, components)
}
