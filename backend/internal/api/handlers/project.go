package handlers

import (
	"fmt"
	"net/http"
	"sort"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProjectHandler struct{ db *gorm.DB }

func NewProjectHandler(db *gorm.DB) *ProjectHandler { return &ProjectHandler{db: db} }

type projectDTO struct {
	Name        string `json:"name" binding:"required"`
	Key         string `json:"key" binding:"required,max=10"`
	Description string `json:"description"`
}

// projectListItem decorates a project with the caller's star state. Embeds
// Project so existing fields serialise unchanged.
type projectListItem struct {
	models.Project
	IsStarred bool `json:"is_starred"`
}

// List returns every project the user owns or is a member of, with starred
// projects pinned to the top.
func (h *ProjectHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	var projects []models.Project
	h.db.
		Distinct("projects.*").
		Joins("LEFT JOIN members m ON m.project_id = projects.id AND m.deleted_at IS NULL").
		Where("projects.owner_id = ? OR m.user_id = ?", userID, userID).
		Find(&projects)

	// Look up the caller's stars in one query.
	var stars []models.ProjectStar
	h.db.Where("user_id = ?", userID).Find(&stars)
	starred := make(map[uint]bool, len(stars))
	for _, s := range stars {
		starred[s.ProjectID] = true
	}

	out := make([]projectListItem, 0, len(projects))
	for _, p := range projects {
		out = append(out, projectListItem{Project: p, IsStarred: starred[p.ID]})
	}
	// Stable sort: starred first, then by ID asc (preserves insertion order).
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].IsStarred != out[j].IsStarred {
			return out[i].IsStarred
		}
		return out[i].ID < out[j].ID
	})

	c.JSON(http.StatusOK, out)
}

// Star pins a project to the top of the caller's project list.
func (h *ProjectHandler) Star(c *gin.Context) {
	userID, _ := c.Get("userID")
	pidStr := c.Param("projectId")
	var pid uint
	if _, err := fmt.Sscanf(pidStr, "%d", &pid); err != nil || pid == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}
	star := models.ProjectStar{UserID: userID.(uint), ProjectID: pid}
	// Idempotent: ignore unique-constraint conflicts.
	if err := h.db.Where("user_id = ? AND project_id = ?", userID, pid).
		FirstOrCreate(&star).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"starred": true})
}

// Unstar removes the caller's star on a project. Idempotent.
func (h *ProjectHandler) Unstar(c *gin.Context) {
	userID, _ := c.Get("userID")
	pid := c.Param("projectId")
	h.db.Where("user_id = ? AND project_id = ?", userID, pid).
		Unscoped().Delete(&models.ProjectStar{})
	c.JSON(http.StatusOK, gin.H{"starred": false})
}

// Create creates a project and auto-registers the owner as Admin member.
func (h *ProjectHandler) Create(c *gin.Context) {
	userID, _ := c.Get("userID")
	var dto projectDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project := models.Project{
		Name:        dto.Name,
		Key:         dto.Key,
		Description: dto.Description,
		OwnerID:     userID.(uint),
	}

	// Resolve the Admin system role ID
	var adminRole models.Role
	h.db.Where("is_system = true AND LOWER(name) = 'admin'").First(&adminRole)
	adminRoleID := adminRole.ID
	if adminRoleID == 0 {
		adminRoleID = 1 // fallback
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&project).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.Member{
			ProjectID: project.ID,
			UserID:    userID.(uint),
			RoleID:    adminRoleID,
		}).Error; err != nil {
			return err
		}
		for _, seed := range models.DefaultStatusSeed {
			row := seed
			row.ProjectID = project.ID
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, project)
}

func (h *ProjectHandler) Get(c *gin.Context) {
	var project models.Project
	if err := h.db.Preload("Owner").First(&project, c.Param("projectId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	c.JSON(http.StatusOK, project)
}

type updateProjectDTO struct {
	Name        *string `json:"name"`
	Key         *string `json:"key"`
	Description *string `json:"description"`
	DateFormat  *string `json:"date_format"`
	TimeFormat  *string `json:"time_format"`
	Category    *string `json:"category"`
}

func (h *ProjectHandler) Update(c *gin.Context) {
	var project models.Project
	if err := h.db.First(&project, c.Param("projectId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	var dto updateProjectDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if dto.Name != nil {
		project.Name = *dto.Name
	}
	if dto.Key != nil {
		project.Key = *dto.Key
	}
	if dto.Description != nil {
		project.Description = *dto.Description
	}
	if dto.DateFormat != nil {
		project.DateFormat = *dto.DateFormat
	}
	if dto.TimeFormat != nil {
		project.TimeFormat = *dto.TimeFormat
	}
	if dto.Category != nil {
		project.Category = *dto.Category
	}
	h.db.Save(&project)
	c.JSON(http.StatusOK, project)
}

func (h *ProjectHandler) Delete(c *gin.Context) {
	if err := h.db.Delete(&models.Project{}, c.Param("projectId")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
