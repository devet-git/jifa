package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StatusHandler struct{ db *gorm.DB }

func NewStatusHandler(db *gorm.DB) *StatusHandler { return &StatusHandler{db: db} }

type statusDTO struct {
	Key      string                `json:"key" binding:"required,max=50"`
	Name     string                `json:"name" binding:"required,max=80"`
	Category models.StatusCategory `json:"category" binding:"required"`
	Color    string                `json:"color"`
}

type reorderRequest struct {
	StatusIDs []uint `json:"status_ids" binding:"required,min=1"`
}

func (h *StatusHandler) List(c *gin.Context) {
	var defs []models.StatusDefinition
	h.db.Where("project_id = ?", c.Param("projectId")).
		Order("order_idx ASC, id ASC").
		Find(&defs)
	c.JSON(http.StatusOK, defs)
}

func (h *StatusHandler) Create(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var dto statusDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !models.ValidStatusCategory(dto.Category) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category"})
		return
	}
	key := normalizeKey(dto.Key)
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "key must be alphanumeric/underscore"})
		return
	}

	// Tail-end ordering: place at the end of its category.
	var maxOrder int
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ?", pid).
		Select("COALESCE(MAX(order_idx), -1)").Row().Scan(&maxOrder)

	def := models.StatusDefinition{
		ProjectID: uint(pid),
		Key:       key,
		Name:      dto.Name,
		Category:  dto.Category,
		Color:     dto.Color,
		OrderIdx:  maxOrder + 1,
	}
	if err := h.db.Create(&def).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "status key already exists"})
		return
	}
	actorID, _ := c.Get("userID")
	LogAudit(h.db, def.ProjectID, actorID.(uint), "status.created", "status", def.ID,
		def.Name+" ("+string(def.Category)+")")
	c.JSON(http.StatusCreated, def)
}

func (h *StatusHandler) Update(c *gin.Context) {
	var def models.StatusDefinition
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&def, c.Param("statusId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "status not found"})
		return
	}
	var dto statusDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !models.ValidStatusCategory(dto.Category) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category"})
		return
	}
	def.Name = dto.Name
	def.Category = dto.Category
	def.Color = dto.Color
	// Key changes intentionally not supported via update — keys are referenced
	// by Issue.Status rows. To rename a status keep the same key.
	h.db.Save(&def)
	c.JSON(http.StatusOK, def)
}

// Delete refuses to remove a status that any issue still references.
func (h *StatusHandler) Delete(c *gin.Context) {
	var def models.StatusDefinition
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&def, c.Param("statusId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "status not found"})
		return
	}
	var inUse int64
	h.db.Model(&models.Issue{}).
		Where("project_id = ? AND status = ?", def.ProjectID, def.Key).
		Count(&inUse)
	if inUse > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "status is still in use by issues — move them first",
		})
		return
	}
	h.db.Delete(&def)
	actorID, _ := c.Get("userID")
	LogAudit(h.db, def.ProjectID, actorID.(uint), "status.deleted", "status", def.ID, def.Name)
	c.Status(http.StatusNoContent)
}

func (h *StatusHandler) Reorder(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var req reorderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err := h.db.Transaction(func(tx *gorm.DB) error {
		for i, id := range req.StatusIDs {
			if err := tx.Model(&models.StatusDefinition{}).
				Where("id = ? AND project_id = ?", id, pid).
				Update("order_idx", i).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		respondInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func normalizeKey(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		ch := s[i]
		switch {
		case ch >= 'A' && ch <= 'Z':
			out = append(out, ch+32)
		case ch >= 'a' && ch <= 'z', ch >= '0' && ch <= '9', ch == '_':
			out = append(out, ch)
		case ch == ' ' || ch == '-':
			out = append(out, '_')
		}
	}
	return strings.Trim(string(out), "_")
}

// IsStatusInCategory returns true when status is one of the project's
// configured statuses whose category matches. It falls back to comparing the
// status string directly against the default key if no row is found, which
// keeps legacy behaviour intact even before seeding.
func IsStatusInCategory(db *gorm.DB, projectID uint, status string, category models.StatusCategory) bool {
	var def models.StatusDefinition
	err := db.Where("project_id = ? AND key = ?", projectID, status).First(&def).Error
	if err == nil {
		return def.Category == category
	}
	// Fallback for projects without statuses yet.
	switch category {
	case models.CategoryDone:
		return status == string(models.StatusDone)
	case models.CategoryInProgress:
		return status == string(models.StatusInProgress) ||
			status == string(models.StatusInReview)
	case models.CategoryTodo:
		return status == string(models.StatusTodo)
	}
	return false
}
