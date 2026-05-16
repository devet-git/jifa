package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

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
// projects pinned to the top. Archived projects are hidden unless the
// ?include_archived=true query flag is set.
func (h *ProjectHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	includeArchived := c.Query("include_archived") == "true"

	q := h.db.
		Distinct("projects.*").
		Joins("LEFT JOIN members m ON m.project_id = projects.id AND m.deleted_at IS NULL").
		Where("projects.owner_id = ? OR m.user_id = ?", userID, userID)
	if !includeArchived {
		q = q.Where("projects.archived_at IS NULL")
	}
	var projects []models.Project
	q.Find(&projects)

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
		respondInternalError(c, "project.star", err)
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
			Role:      models.ProjectRole("admin"),
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
		respondInternalError(c, "project.create", err)
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
	webhook.Dispatch(h.db, project.ID, models.EventProjectUpdated, project)
	c.JSON(http.StatusOK, project)
}

// Archive marks the project as read-only. Reversible via Unarchive.
func (h *ProjectHandler) Archive(c *gin.Context) {
	var project models.Project
	if err := h.db.First(&project, c.Param("projectId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	if project.ArchivedAt != nil {
		c.JSON(http.StatusOK, project) // already archived, no-op
		return
	}
	now := time.Now()
	project.ArchivedAt = &now
	h.db.Save(&project)
	webhook.Dispatch(h.db, project.ID, models.EventProjectUpdated, project)
	c.JSON(http.StatusOK, project)
}

// Unarchive restores a previously archived project.
func (h *ProjectHandler) Unarchive(c *gin.Context) {
	var project models.Project
	if err := h.db.First(&project, c.Param("projectId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	if project.ArchivedAt == nil {
		c.JSON(http.StatusOK, project) // not archived
		return
	}
	if err := h.db.Model(&project).Update("archived_at", nil).Error; err != nil {
		respondInternalError(c, "project.unarchive", err)
		return
	}
	project.ArchivedAt = nil
	webhook.Dispatch(h.db, project.ID, models.EventProjectUpdated, project)
	c.JSON(http.StatusOK, project)
}

// Delete hard-deletes a project. Only the project owner can call this and
// the request body must echo the project name as a typed confirmation —
// this is intentionally onerous because the action is irreversible.
//
// Cascade order matters: GORM does not declare ON DELETE CASCADE on these
// foreign keys, so we explicitly purge every child table in a single
// transaction. The order is leaf-first (deepest dependents first) so that
// no FK references survive when we drop the project row at the end.
func (h *ProjectHandler) Delete(c *gin.Context) {
	userID, _ := c.Get("userID")
	var project models.Project
	if err := h.db.First(&project, c.Param("projectId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	if project.OwnerID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the project owner can delete this project"})
		return
	}
	var body struct {
		Confirm string `json:"confirm"`
	}
	_ = c.ShouldBindJSON(&body)
	if strings.TrimSpace(body.Confirm) != project.Name {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "confirmation does not match project name",
		})
		return
	}

	pid := project.ID
	err := h.db.Transaction(func(tx *gorm.DB) error {
		// Collect issue IDs once — every issue-scoped child filters on them.
		// We use Unscoped to also capture soft-deleted issues so their
		// children don't outlive the project.
		var issueIDs []uint
		if err := tx.Unscoped().Model(&models.Issue{}).
			Where("project_id = ?", pid).
			Pluck("id", &issueIDs).Error; err != nil {
			return fmt.Errorf("collect issue ids: %w", err)
		}

		// 1. Issue-scoped dependents. Use GORM models so table names always
		//    match the migrated schema (e.g. IssueActivity → issue_activities).
		if len(issueIDs) > 0 {
			type childPurge struct {
				out   any
				where string
			}
			children := []childPurge{
				{&models.IssueActivity{}, "issue_id IN ?"},
				{&models.Attachment{}, "issue_id IN ?"},
				{&models.Comment{}, "issue_id IN ?"},
				{&models.Notification{}, "issue_id IN ?"},
				{&models.RecentView{}, "issue_id IN ?"},
				{&models.IssueWatcher{}, "issue_id IN ?"},
				{&models.Worklog{}, "issue_id IN ?"},
				{&models.IssueLink{}, "source_id IN ? OR target_id IN ?"},
			}
			for _, ch := range children {
				q := tx.Unscoped().Where(ch.where, issueIDs)
				if strings.Contains(ch.where, "OR") {
					q = tx.Unscoped().Where(ch.where, issueIDs, issueIDs)
				}
				if err := q.Delete(ch.out).Error; err != nil {
					return fmt.Errorf("purge issue-child %T: %w", ch.out, err)
				}
			}
		}

		// 2. Project-scoped tables.
		projectChildren := []any{
			&models.AuditLog{},
			&models.Board{},
			&models.Component{},
			&models.SavedFilter{},
			&models.IssueTemplate{},
			&models.Issue{}, // after issue_* children
			&models.Label{},
			&models.Member{},
			&models.ProjectStar{},
			&models.Sprint{},
			&models.StatusDefinition{},
			&models.Version{},
			&models.Webhook{},
			&models.WikiPage{},
		}
		for _, m := range projectChildren {
			if err := tx.Unscoped().Where("project_id = ?", pid).
				Delete(m).Error; err != nil {
				return fmt.Errorf("purge project-child %T: %w", m, err)
			}
		}

		// 3. Custom roles attached to this project + their permission grants.
		var roleIDs []uint
		if err := tx.Model(&models.Role{}).
			Where("project_id = ?", pid).
			Pluck("id", &roleIDs).Error; err != nil {
			return fmt.Errorf("collect role ids: %w", err)
		}
		if len(roleIDs) > 0 {
			if err := tx.Where("role_id IN ?", roleIDs).
				Delete(&models.RolePermission{}).Error; err != nil {
				return fmt.Errorf("purge role_permissions: %w", err)
			}
			if err := tx.Unscoped().Where("project_id = ?", pid).
				Delete(&models.Role{}).Error; err != nil {
				return fmt.Errorf("purge roles: %w", err)
			}
		}

		// 4. Finally the project itself (Unscoped → bypass soft-delete).
		if err := tx.Unscoped().Delete(&models.Project{}, pid).Error; err != nil {
			return fmt.Errorf("delete project: %w", err)
		}
		return nil
	})
	if err != nil {
		respondInternalError(c, "project.delete", err)
		return
	}
	c.Status(http.StatusNoContent)
}
