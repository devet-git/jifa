package handlers

import (
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PermissionHandler struct {
	db *gorm.DB
}

func NewPermissionHandler(db *gorm.DB) *PermissionHandler {
	return &PermissionHandler{db: db}
}

func (h *PermissionHandler) List(c *gin.Context) {
	var perms []models.Permission
	h.db.Order(`"group", id`).Find(&perms)
	c.JSON(200, perms)
}

func (h *PermissionHandler) MyPermissions(c *gin.Context) {
	raw, _ := c.Get("permissions")
	perms := raw.(map[string]bool)
	list := make([]string, 0, len(perms))
	for k := range perms {
		list = append(list, k)
	}
	c.JSON(200, list)
}
