package handlers

import (
	"net/http"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FilterHandler struct{ db *gorm.DB }

func NewFilterHandler(db *gorm.DB) *FilterHandler { return &FilterHandler{db: db} }

type filterDTO struct {
	Name      string `json:"name" binding:"required,max=120"`
	Query     string `json:"query" binding:"required"`
	ProjectID *uint  `json:"project_id"`
}

func (h *FilterHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	q := h.db.Where("user_id = ?", userID)
	if pid := c.Query("project_id"); pid != "" {
		q = q.Where("project_id = ?", pid)
	}
	var filters []models.SavedFilter
	q.Order("created_at DESC").Find(&filters)
	c.JSON(http.StatusOK, filters)
}

func (h *FilterHandler) Create(c *gin.Context) {
	userID, _ := c.Get("userID")
	var dto filterDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	f := models.SavedFilter{
		UserID:    userID.(uint),
		ProjectID: dto.ProjectID,
		Name:      dto.Name,
		Query:     dto.Query,
	}
	if err := h.db.Create(&f).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, f)
}

func (h *FilterHandler) Update(c *gin.Context) {
	userID, _ := c.Get("userID")
	var f models.SavedFilter
	if err := h.db.Where("user_id = ?", userID).First(&f, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "filter not found"})
		return
	}
	var dto filterDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	f.Name = dto.Name
	f.Query = dto.Query
	f.ProjectID = dto.ProjectID
	h.db.Save(&f)
	c.JSON(http.StatusOK, f)
}

func (h *FilterHandler) Delete(c *gin.Context) {
	userID, _ := c.Get("userID")
	h.db.Where("user_id = ?", userID).Delete(&models.SavedFilter{}, c.Param("id"))
	c.Status(http.StatusNoContent)
}
