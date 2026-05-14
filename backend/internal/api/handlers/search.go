package handlers

import (
	"net/http"
	"strings"

	"jifa/backend/internal/jql"
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SearchHandler struct{ db *gorm.DB }

func NewSearchHandler(db *gorm.DB) *SearchHandler { return &SearchHandler{db: db} }

// JQL runs a structured query against accessible issues.
func (h *SearchHandler) JQL(c *gin.Context) {
	userID, _ := c.Get("userID")
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusOK, []models.Issue{})
		return
	}
	issues, err := jql.Execute(h.db, q, userID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i := range issues {
		setIssueKey(&issues[i])
	}
	c.JSON(http.StatusOK, issues)
}

type searchResults struct {
	Issues   []models.Issue   `json:"issues"`
	Projects []models.Project `json:"projects"`
}

// Search runs a basic ILIKE match across the user's accessible projects.
// Returns matching issues (by title, description, or key) and projects
// (by name or key). Capped to 20 each.
func (h *SearchHandler) Search(c *gin.Context) {
	userID, _ := c.Get("userID")
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusOK, searchResults{Issues: []models.Issue{}, Projects: []models.Project{}})
		return
	}
	like := "%" + strings.ToLower(q) + "%"

	// Projects the user can access.
	var accessibleProjectIDs []uint
	h.db.Model(&models.Project{}).
		Distinct("projects.id").
		Joins("LEFT JOIN members m ON m.project_id = projects.id AND m.deleted_at IS NULL").
		Where("projects.owner_id = ? OR m.user_id = ?", userID, userID).
		Pluck("projects.id", &accessibleProjectIDs)

	out := searchResults{
		Issues:   []models.Issue{},
		Projects: []models.Project{},
	}
	if len(accessibleProjectIDs) == 0 {
		c.JSON(http.StatusOK, out)
		return
	}

	// Issue search. Match key (PROJ-123) by joining the project.
	var issues []models.Issue
	h.db.Preload("Project").Preload("Assignee").
		Joins("JOIN projects p ON p.id = issues.project_id").
		Where("issues.project_id IN ?", accessibleProjectIDs).
		Where(
			"LOWER(issues.title) LIKE ? OR LOWER(issues.description) LIKE ? OR LOWER(p.key || '-' || issues.number) LIKE ?",
			like, like, like,
		).
		Order("issues.updated_at DESC").
		Limit(20).
		Find(&issues)
	for i := range issues {
		setIssueKey(&issues[i])
	}
	out.Issues = issues

	// Project search within the accessible set.
	h.db.Where("id IN ?", accessibleProjectIDs).
		Where("LOWER(name) LIKE ? OR LOWER(key) LIKE ?", like, like).
		Order("updated_at DESC").
		Limit(20).
		Find(&out.Projects)

	c.JSON(http.StatusOK, out)
}
