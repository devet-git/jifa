package middleware

import (
	"errors"
	"net/http"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// LookupRole returns the user's effective role on a project, or "" if no
// access. Project owners are treated as Admin even without an explicit member
// row (legacy data).
func LookupRole(db *gorm.DB, userID, projectID uint) models.ProjectRole {
	var project models.Project
	if err := db.Select("id, owner_id").First(&project, projectID).Error; err != nil {
		return ""
	}
	if project.OwnerID == userID {
		return models.RoleAdmin
	}
	var m models.Member
	if err := db.Where("project_id = ? AND user_id = ?", projectID, userID).First(&m).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ""
		}
		return ""
	}
	return m.Role
}

// CanAccess returns whether userRole has at least minRole's privileges.
func CanAccess(userRole, minRole models.ProjectRole) bool {
	return models.RoleRank(userRole) >= models.RoleRank(minRole)
}

// RequireProjectRole aborts the request with 403/404 unless the authenticated
// user has at least minRole on the project identified by URL param
// projectIdParam. It stashes the resolved role on the context as "projectRole".
func RequireProjectRole(db *gorm.DB, projectIdParam string, minRole models.ProjectRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := c.Get("userID")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		pid := parseUint(c.Param(projectIdParam))
		if pid == 0 {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
			return
		}
		role := LookupRole(db, uid.(uint), pid)
		if role == "" {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "project not found"})
			return
		}
		if !CanAccess(role, minRole) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient role"})
			return
		}
		c.Set("projectID", pid)
		c.Set("projectRole", role)
		c.Next()
	}
}

// RequireIssueRole authorises the request based on the project the issue
// belongs to. Param idParam is the issue id URL param.
func RequireIssueRole(db *gorm.DB, idParam string, minRole models.ProjectRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, ok := c.Get("userID")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		var issue models.Issue
		if err := db.Select("id, project_id").First(&issue, c.Param(idParam)).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "issue not found"})
			return
		}
		role := LookupRole(db, uid.(uint), issue.ProjectID)
		if role == "" {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "issue not found"})
			return
		}
		if !CanAccess(role, minRole) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient role"})
			return
		}
		c.Set("projectID", issue.ProjectID)
		c.Set("projectRole", role)
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
