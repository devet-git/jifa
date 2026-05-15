package handlers

import (
	"net/http"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RoleHandler struct {
	db *gorm.DB
}

func NewRoleHandler(db *gorm.DB) *RoleHandler {
	return &RoleHandler{db: db}
}

func (h *RoleHandler) List(c *gin.Context) {
	projectID := c.GetUint("projectID")
	var roles []models.Role
	h.db.Where("project_id IS NULL OR project_id = ?", projectID).Find(&roles)
	c.JSON(200, roles)
}

type createRoleDTO struct {
	Name string `json:"name" binding:"required"`
}

func (h *RoleHandler) Create(c *gin.Context) {
	projectID := c.GetUint("projectID")
	var dto createRoleDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	role := models.Role{
		ProjectID: &projectID,
		Name:      dto.Name,
		IsSystem:  false,
	}
	if err := h.db.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create role"})
		return
	}
	c.JSON(201, role)
}

type updateRoleDTO struct {
	Name *string `json:"name"`
}

func (h *RoleHandler) Update(c *gin.Context) {
	roleID := parseRoleParamUint(c.Param("roleId"))
	var role models.Role
	if err := h.db.First(&role, roleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
		return
	}
	if role.IsSystem {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot edit system role"})
		return
	}
	var dto updateRoleDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updates := map[string]any{}
	if dto.Name != nil {
		updates["name"] = *dto.Name
	}
	if len(updates) > 0 {
		h.db.Model(&role).Updates(updates)
	}
	h.db.First(&role, roleID)
	c.JSON(200, role)
}

func (h *RoleHandler) Delete(c *gin.Context) {
	roleID := parseRoleParamUint(c.Param("roleId"))
	var role models.Role
	if err := h.db.First(&role, roleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
		return
	}
	if role.IsSystem {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete system role"})
		return
	}
	// Check if any members are assigned this role
	var count int64
	h.db.Model(&models.Member{}).Where("role_id = ?", roleID).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role is assigned to members"})
		return
	}
	h.db.Where("role_id = ?", roleID).Delete(&models.RolePermission{})
	h.db.Delete(&role)
	c.Status(204)
}

// GetRolePermissions returns the list of permission keys for a role.
func (h *RoleHandler) GetPermissions(c *gin.Context) {
	roleID := parseRoleParamUint(c.Param("roleId"))
	keys := []string{}
	h.db.Table("role_permissions").
		Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ?", roleID).
		Pluck("permissions.key", &keys)
	c.JSON(200, keys)
}

// SetPermissions replaces all permissions for a role.
func (h *RoleHandler) SetPermissions(c *gin.Context) {
	roleID := parseRoleParamUint(c.Param("roleId"))
	var role models.Role
	if err := h.db.First(&role, roleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
		return
	}
	if role.IsSystem {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot edit system role permissions"})
		return
	}
	var dto struct {
		Permissions []string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Resolve keys to IDs
	var perms []models.Permission
	h.db.Where("key IN ?", dto.Permissions).Find(&perms)
	// Replace all
	h.db.Where("role_id = ?", roleID).Delete(&models.RolePermission{})
	for _, p := range perms {
		h.db.Create(&models.RolePermission{RoleID: roleID, PermissionID: p.ID})
	}
	c.JSON(200, dto.Permissions)
}

func parseRoleParamUint(s string) uint {
	var n uint
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0
		}
		n = n*10 + uint(ch-'0')
	}
	return n
}
