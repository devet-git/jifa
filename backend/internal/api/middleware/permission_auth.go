package middleware

import (
	"net/http"
	"strings"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// LoadProjectPermissions looks up the authenticated user's effective
// permissions on the project (URL param "projectId") and stores a
// map[string]bool on the gin context under "permissions".  The project
// owner is implicitly granted all permissions.
func LoadProjectPermissions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := c.Get("userID")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		projectID := parseUint(c.Param("projectId"))
		if projectID == 0 {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
			return
		}

		// Resolve project to check ownership
		var project models.Project
		if err := db.Select("id, owner_id").First(&project, projectID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "project not found"})
			return
		}

		var permMap map[string]bool

		if project.OwnerID == uid.(uint) {
			// Owner gets everything
			var all []models.Permission
			db.Find(&all)
			permMap = make(map[string]bool, len(all))
			for _, p := range all {
				permMap[p.Key] = true
			}
		} else {
			// Look up member roles → gather permissions
			var member models.Member
			if err := db.Where("project_id = ? AND user_id = ?", projectID, uid).First(&member).Error; err != nil {
				c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "project not found"})
				return
			}

			var keys []string
			db.Table("role_permissions").
				Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
				Where("role_permissions.role_id = ?", member.RoleID).
				Pluck("permissions.key", &keys)

			permMap = make(map[string]bool, len(keys))
			for _, k := range keys {
				permMap[k] = true
			}
		}

		c.Set("projectID", projectID)
		c.Set("permissions", permMap)
		c.Next()
	}
}

// RequirePermission aborts the request with 403 unless the caller's
// permission set (previously loaded by LoadProjectPermissions) contains
// the required key.
func RequirePermission(permKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, exists := c.Get("permissions")
		if !exists {
			LoadProjectPermissions(nil)(c) // fallback (shouldn't happen)
			raw, _ = c.Get("permissions")
		}
		perms := raw.(map[string]bool)
		if !perms[permKey] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}

// RequireIssuePermission resolves the project from the issue, loads
// permissions, and requires the given permission key.
func RequireIssuePermission(db *gorm.DB, permKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := c.Get("userID")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		var issue models.Issue
		if err := db.Select("id, project_id").First(&issue, c.Param("id")).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "issue not found"})
			return
		}

		// Resolve project
		var project models.Project
		if err := db.Select("id, owner_id").First(&project, issue.ProjectID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "issue not found"})
			return
		}

		var permMap map[string]bool

		if project.OwnerID == uid.(uint) {
			var all []models.Permission
			db.Find(&all)
			permMap = make(map[string]bool, len(all))
			for _, p := range all {
				permMap[p.Key] = true
			}
		} else {
			var member models.Member
			if err := db.Where("project_id = ? AND user_id = ?", issue.ProjectID, uid).First(&member).Error; err != nil {
				c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "issue not found"})
				return
			}

			var keys []string
			db.Table("role_permissions").
				Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
				Where("role_permissions.role_id = ?", member.RoleID).
				Pluck("permissions.key", &keys)

			permMap = make(map[string]bool, len(keys))
			for _, k := range keys {
				permMap[k] = true
			}
		}

		c.Set("projectID", issue.ProjectID)
		c.Set("permissions", permMap)
		c.Next()
	}
}

// BlockIfArchived rejects mutating requests against an archived project with
// 423 Locked. Mount it after LoadProjectPermissions so we already have the
// projectID. Safe (GET/HEAD/OPTIONS) methods always pass through; archive
// transition endpoints (/archive, /unarchive) are skipped so a user can
// always restore an archived project.
func BlockIfArchived(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}
		// Let the archive-transition endpoints through regardless of state,
		// and let the project-delete endpoint through so an archived project
		// can still be destroyed by its owner. FullPath returns the route
		// template (e.g. /api/v1/projects/:projectId/unarchive).
		path := c.FullPath()
		if strings.HasSuffix(path, "/archive") || strings.HasSuffix(path, "/unarchive") {
			c.Next()
			return
		}
		if c.Request.Method == http.MethodDelete && strings.HasSuffix(path, "/projects/:projectId") {
			c.Next()
			return
		}
		raw, ok := c.Get("projectID")
		if !ok {
			c.Next()
			return
		}
		projectID, _ := raw.(uint)
		if projectID == 0 {
			c.Next()
			return
		}
		var project models.Project
		if err := db.Select("id, archived_at").First(&project, projectID).Error; err != nil {
			c.Next() // let the downstream handler return its own 404
			return
		}
		if project.ArchivedAt != nil {
			c.AbortWithStatusJSON(http.StatusLocked, gin.H{
				"error": "project is archived — unarchive it before making changes",
			})
			return
		}
		c.Next()
	}
}

func parseUint(s string) uint {
	var n uint
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0
		}
		n = n*10 + uint(ch-'0')
	}
	return n
}
