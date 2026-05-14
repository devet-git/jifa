package handlers

import (
	"net/http"
	"strconv"
	"time"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type VersionHandler struct{ db *gorm.DB }

func NewVersionHandler(db *gorm.DB) *VersionHandler { return &VersionHandler{db: db} }

type versionDTO struct {
	Name        string     `json:"name" binding:"required"`
	Description string     `json:"description"`
	ReleaseDate *time.Time `json:"release_date"`
}

// stats is the per-version progress payload.
type versionStats struct {
	models.Version
	IssueCount     int `json:"issue_count"`
	CompletedCount int `json:"completed_count"`
}

// List returns versions plus simple progress stats (issue counts grouped by
// done vs not-done).
func (h *VersionHandler) List(c *gin.Context) {
	pid := c.Param("projectId")
	var versions []models.Version
	h.db.Where("project_id = ?", pid).
		Order("released_at DESC NULLS FIRST, release_date ASC NULLS LAST, id ASC").
		Find(&versions)

	// Look up the project's done-category status keys once.
	pidInt, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var doneKeys []string
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ? AND category = ?", uint(pidInt), models.CategoryDone).
		Pluck("key", &doneKeys)
	if len(doneKeys) == 0 {
		doneKeys = []string{string(models.StatusDone)}
	}

	out := make([]versionStats, 0, len(versions))
	for _, v := range versions {
		entry := versionStats{Version: v}
		var total, completed int64
		h.db.Model(&models.Issue{}).Where("version_id = ?", v.ID).Count(&total)
		h.db.Model(&models.Issue{}).
			Where("version_id = ? AND status IN ?", v.ID, doneKeys).
			Count(&completed)
		entry.IssueCount = int(total)
		entry.CompletedCount = int(completed)
		out = append(out, entry)
	}
	c.JSON(http.StatusOK, out)
}

func (h *VersionHandler) Create(c *gin.Context) {
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	var dto versionDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	v := models.Version{
		ProjectID:   uint(pid),
		Name:        dto.Name,
		Description: dto.Description,
		ReleaseDate: dto.ReleaseDate,
		Status:      models.VersionUnreleased,
	}
	if err := h.db.Create(&v).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, v)
}

func (h *VersionHandler) Update(c *gin.Context) {
	var v models.Version
	if err := h.db.Where("project_id = ?", c.Param("projectId")).
		First(&v, c.Param("versionId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}
	var dto versionDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	v.Name = dto.Name
	v.Description = dto.Description
	v.ReleaseDate = dto.ReleaseDate
	h.db.Save(&v)
	c.JSON(http.StatusOK, v)
}

func (h *VersionHandler) Release(c *gin.Context) {
	now := time.Now()
	res := h.db.Model(&models.Version{}).
		Where("project_id = ? AND id = ?", c.Param("projectId"), c.Param("versionId")).
		Updates(map[string]any{
			"status":      models.VersionReleased,
			"released_at": &now,
		})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": res.Error.Error()})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}
	pid, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	vid, _ := strconv.ParseUint(c.Param("versionId"), 10, 64)
	actorID, _ := c.Get("userID")
	LogAudit(h.db, uint(pid), actorID.(uint), "version.released", "version", uint(vid), "")
	c.JSON(http.StatusOK, gin.H{"status": "released"})
}

func (h *VersionHandler) Unrelease(c *gin.Context) {
	res := h.db.Model(&models.Version{}).
		Where("project_id = ? AND id = ?", c.Param("projectId"), c.Param("versionId")).
		Updates(map[string]any{
			"status":      models.VersionUnreleased,
			"released_at": nil,
		})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": res.Error.Error()})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "unreleased"})
}

func (h *VersionHandler) Reorder(c *gin.Context) {
	var req struct {
		IDs []uint `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pid := c.Param("projectId")
	for rank, id := range req.IDs {
		h.db.Model(&models.Version{}).
			Where("id = ? AND project_id = ?", id, pid).
			Update("rank", rank)
	}
	c.Status(http.StatusNoContent)
}

func (h *VersionHandler) Delete(c *gin.Context) {
	// Clear fix-version pointer on any issue still tied to this version.
	h.db.Model(&models.Issue{}).
		Where("version_id = ?", c.Param("versionId")).
		Update("version_id", nil)
	h.db.Where("project_id = ?", c.Param("projectId")).
		Delete(&models.Version{}, c.Param("versionId"))
	c.Status(http.StatusNoContent)
}

