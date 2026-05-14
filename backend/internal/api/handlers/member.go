package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MemberHandler struct{ db *gorm.DB }

func NewMemberHandler(db *gorm.DB) *MemberHandler { return &MemberHandler{db: db} }

func validRole(r models.ProjectRole) bool {
	switch r {
	case models.RoleAdmin, models.RoleMember, models.RoleViewer:
		return true
	}
	return false
}

func projectIDFromParam(c *gin.Context) (uint, bool) {
	v, err := strconv.ParseUint(c.Param("projectId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return 0, false
	}
	return uint(v), true
}

// List returns every member of the project (including owner) with user info.
func (h *MemberHandler) List(c *gin.Context) {
	pid, ok := projectIDFromParam(c)
	if !ok {
		return
	}
	var members []models.Member
	h.db.Preload("User").Where("project_id = ?", pid).Find(&members)
	c.JSON(http.StatusOK, members)
}

type addMemberRequest struct {
	Email  string             `json:"email" binding:"required,email"`
	UserID uint               `json:"user_id"`
	Role   models.ProjectRole `json:"role" binding:"required"`
}

// Add invites a user (by email) to the project with a role. Admin only.
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
	if !validRole(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user with that email does not exist"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Already a member?
	var existing models.Member
	err := h.db.Where("project_id = ? AND user_id = ?", pid, user.ID).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user is already a member"})
		return
	}

	member := models.Member{ProjectID: pid, UserID: user.ID, Role: req.Role}
	if err := h.db.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.db.Preload("User").First(&member, member.ID)

	actorID, _ := c.Get("userID")
	LogAudit(h.db, pid, actorID.(uint), "member.added", "user", user.ID,
		user.Email+" as "+string(req.Role))

	c.JSON(http.StatusCreated, member)
}

type updateRoleRequest struct {
	Role models.ProjectRole `json:"role" binding:"required"`
}

// UpdateRole changes a member's role. Admin only. Cannot demote the project
// owner.
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
	if !validRole(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}

	var member models.Member
	if err := h.db.Where("project_id = ?", pid).First(&member, memberID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}

	var project models.Project
	h.db.Select("id, owner_id").First(&project, pid)
	if project.OwnerID == member.UserID && req.Role != models.RoleAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot demote the project owner"})
		return
	}

	old := member.Role
	member.Role = req.Role
	h.db.Save(&member)
	h.db.Preload("User").First(&member, member.ID)

	actorID, _ := c.Get("userID")
	LogAudit(h.db, pid, actorID.(uint), "member.role_changed", "user", member.UserID,
		string(old)+" → "+string(req.Role))

	c.JSON(http.StatusOK, member)
}

// Remove deletes a member. Admin only. Cannot remove the project owner.
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
	c.Status(http.StatusNoContent)
}
