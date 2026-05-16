package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MemberHandler struct{ db *gorm.DB }

func NewMemberHandler(db *gorm.DB) *MemberHandler { return &MemberHandler{db: db} }

func projectIDFromParam(c *gin.Context) (uint, bool) {
	v, err := strconv.ParseUint(c.Param("projectId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return 0, false
	}
	return uint(v), true
}

// resolveSystemRoleID looks up a system role by name (admin/member/viewer)
// and returns its ID.  Used to map legacy role strings to the new permission
// system.  Returns 0 if not found.
func (h *MemberHandler) resolveSystemRoleID(name string) uint {
	var role models.Role
	h.db.Where("is_system = true AND LOWER(name) = ?", strings.ToLower(name)).First(&role)
	return role.ID
}

// List returns every member of the project (including owner) with user info.
func (h *MemberHandler) List(c *gin.Context) {
	pid, ok := projectIDFromParam(c)
	if !ok {
		return
	}
	var members []models.Member
	h.db.Preload("User").Preload("RoleModel").Where("project_id = ?", pid).Find(&members)
	c.JSON(http.StatusOK, members)
}

type addMemberRequest struct {
	Email  string `json:"email" binding:"required,email"`
	UserID uint   `json:"user_id"`
	RoleID uint   `json:"role_id"`
}

// Add invites a user (by email) to the project with a role.
func (h *MemberHandler) Add(c *gin.Context) {
	pid, ok := projectIDFromParam(c)
	if !ok {
		return
	}
	var req addMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user with that email does not exist"})
			return
		}
		respondInternal(c, err)
		return
	}

	// Resolve role_id to a valid role
	roleID := req.RoleID
	if roleID == 0 {
		roleID = h.resolveSystemRoleID("member")
	}

	// Already a member? Check both active and soft-deleted records.
	var existing models.Member
	err := h.db.Where("project_id = ? AND user_id = ?", pid, user.ID).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user is already a member"})
		return
	}

	// Check if there's a soft-deleted member record to restore.
	var deleted models.Member
	if err := h.db.Unscoped().Where("project_id = ? AND user_id = ?", pid, user.ID).First(&deleted).Error; err == nil {
		deleted.DeletedAt = gorm.DeletedAt{Valid: false}
		deleted.RoleID = roleID
		h.db.Unscoped().Save(&deleted)
		h.db.Preload("User").Preload("RoleModel").First(&deleted, deleted.ID)

		actorID, _ := c.Get("userID")
		LogAudit(h.db, pid, actorID.(uint), "member.added", "user", user.ID,
			user.Email+" as role "+strconv.Itoa(int(roleID)))
		webhook.Dispatch(h.db, pid, models.EventMemberAdded, deleted)

		c.JSON(http.StatusCreated, deleted)
		return
	}

	member := models.Member{ProjectID: pid, UserID: user.ID, RoleID: roleID}
	if err := h.db.Create(&member).Error; err != nil {
		if strings.Contains(err.Error(), "idx_member_project_user") {
			c.JSON(http.StatusConflict, gin.H{"error": "user is already a member"})
			return
		}
		respondInternal(c, err)
		return
	}
	h.db.Preload("User").Preload("RoleModel").First(&member, member.ID)

	actorID, _ := c.Get("userID")
	LogAudit(h.db, pid, actorID.(uint), "member.added", "user", user.ID,
		user.Email+" as role "+strconv.Itoa(int(roleID)))
	webhook.Dispatch(h.db, pid, models.EventMemberAdded, member)

	c.JSON(http.StatusCreated, member)
}

type updateRoleRequest struct {
	RoleID uint `json:"role_id"`
}

// UpdateRole changes a member's role. Cannot demote the project owner.
func (h *MemberHandler) UpdateRole(c *gin.Context) {
	pid, ok := projectIDFromParam(c)
	if !ok {
		return
	}
	memberID := c.Param("memberId")

	var req updateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var member models.Member
	if err := h.db.Where("project_id = ?", pid).First(&member, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}

	var project models.Project
	h.db.Select("id, owner_id").First(&project, pid)
	if project.OwnerID == member.UserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot change the project owner's role"})
		return
	}

	oldID := member.RoleID
	member.RoleID = req.RoleID
	h.db.Save(&member)
	h.db.Preload("User").Preload("RoleModel").First(&member, member.ID)

	actorID, _ := c.Get("userID")
	LogAudit(h.db, pid, actorID.(uint), "member.role_changed", "user", member.UserID,
		strconv.Itoa(int(oldID))+" → "+strconv.Itoa(int(req.RoleID)))
	webhook.Dispatch(h.db, pid, models.EventMemberRoleChanged, gin.H{
		"member":      member,
		"old_role_id": oldID,
		"new_role_id": req.RoleID,
	})

	c.JSON(http.StatusOK, member)
}

// Remove deletes a member. Cannot remove the project owner.
func (h *MemberHandler) Remove(c *gin.Context) {
	pid, ok := projectIDFromParam(c)
	if !ok {
		return
	}
	memberID := c.Param("memberId")

	var member models.Member
	if err := h.db.Where("project_id = ?", pid).First(&member, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}

	var project models.Project
	h.db.Select("id, owner_id").First(&project, pid)
	if project.OwnerID == member.UserID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot remove the project owner"})
		return
	}

	h.db.Delete(&member)
	actorID, _ := c.Get("userID")
	LogAudit(h.db, pid, actorID.(uint), "member.removed", "user", member.UserID, "")
	webhook.Dispatch(h.db, pid, models.EventMemberRemoved, gin.H{
		"member_id": member.ID,
		"user_id":   member.UserID,
	})
	c.Status(http.StatusNoContent)
}
