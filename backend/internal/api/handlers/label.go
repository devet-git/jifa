package handlers

import (
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LabelHandler struct{ db *gorm.DB }

func NewLabelHandler(db *gorm.DB) *LabelHandler { return &LabelHandler{db: db} }

func (h *LabelHandler) List(c *gin.Context) {
	var labels []models.Label
	h.db.Where("project_id = ?", c.Param("projectId")).Find(&labels)
	c.JSON(http.StatusOK, labels)
}

func (h *LabelHandler) Create(c *gin.Context) {
	pid, err := strconv.ParseUint(c.Param("projectId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}
	var label models.Label
	if err := c.ShouldBindJSON(&label); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	label.ProjectID = uint(pid)
	if err := h.db.Create(&label).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, label)
}

func (h *LabelHandler) Delete(c *gin.Context) {
	h.db.Delete(&models.Label{}, c.Param("labelId"))
	c.Status(http.StatusNoContent)
}

func (h *LabelHandler) SetIssueLabels(c *gin.Context) {
	var issue models.Issue
	if err := h.db.First(&issue, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}
	var body struct {
		LabelIDs []uint `json:"label_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var labels []models.Label
	if len(body.LabelIDs) > 0 {
		h.db.Find(&labels, body.LabelIDs)
	}
	if err := h.db.Model(&issue).Association("Labels").Replace(labels); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, labels)
}
