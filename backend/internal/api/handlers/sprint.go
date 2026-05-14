package handlers

import (
	"net/http"
	"strconv"
	"time"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SprintHandler struct{ db *gorm.DB }

func NewSprintHandler(db *gorm.DB) *SprintHandler { return &SprintHandler{db: db} }

func (h *SprintHandler) List(c *gin.Context) {
	var sprints []models.Sprint
	h.db.Where("project_id = ?", c.Param("projectId")).
		Preload("Issues", func(db *gorm.DB) *gorm.DB {
			return db.Order("rank ASC, id ASC")
		}).
		Order("start_date ASC, id ASC").
		Find(&sprints)
	c.JSON(http.StatusOK, sprints)
}

func (h *SprintHandler) Create(c *gin.Context) {
	var sprint models.Sprint
	if err := c.ShouldBindJSON(&sprint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	projectID, _ := strconv.ParseUint(c.Param("projectId"), 10, 64)
	sprint.ProjectID = uint(projectID)
	if err := h.db.Create(&sprint).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sprint)
}

func (h *SprintHandler) Update(c *gin.Context) {
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sprint not found"})
		return
	}
	c.ShouldBindJSON(&sprint)
	h.db.Save(&sprint)
	c.JSON(http.StatusOK, sprint)
}

func (h *SprintHandler) Start(c *gin.Context) {
	now := time.Now()
	h.db.Model(&models.Sprint{}).Where("id = ?", c.Param("sprintId")).
		Updates(map[string]any{
			"status":     models.SprintActive,
			"start_date": &now,
		})
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err == nil {
		webhook.Dispatch(h.db, sprint.ProjectID, models.EventSprintStarted, sprint)
	}
	c.JSON(http.StatusOK, gin.H{"status": "active"})
}

func (h *SprintHandler) Complete(c *gin.Context) {
	now := time.Now()
	h.db.Model(&models.Sprint{}).Where("id = ?", c.Param("sprintId")).
		Updates(map[string]any{
			"status":       models.SprintComplete,
			"completed_at": &now,
		})
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err == nil {
		webhook.Dispatch(h.db, sprint.ProjectID, models.EventSprintCompleted, sprint)
	}
	c.JSON(http.StatusOK, gin.H{"status": "completed"})
}

type sprintRetroResponse struct {
	Sprint          models.Sprint  `json:"sprint"`
	CommittedPoints int            `json:"committed_points"`
	DeliveredPoints int            `json:"delivered_points"`
	CommittedIssues int            `json:"committed_issues"`
	DeliveredIssues int            `json:"delivered_issues"`
	Completed       []models.Issue `json:"completed"`
	NotCompleted    []models.Issue `json:"not_completed"`
	ScopeAdded      []models.Issue `json:"scope_added"`
}

func (h *SprintHandler) Retrospective(c *gin.Context) {
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sprint not found"})
		return
	}

	var issues []models.Issue
	h.db.Preload("Assignee").
		Where("sprint_id = ?", sprint.ID).
		Find(&issues)

	// Resolve done-category keys.
	var doneKeys []string
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ? AND category = ?", sprint.ProjectID, models.CategoryDone).
		Pluck("key", &doneKeys)
	if len(doneKeys) == 0 {
		doneKeys = []string{string(models.StatusDone)}
	}
	doneSet := map[string]bool{}
	for _, k := range doneKeys {
		doneSet[k] = true
	}

	resp := sprintRetroResponse{Sprint: sprint}
	for _, issue := range issues {
		pts := 0
		if issue.StoryPoints != nil {
			pts = *issue.StoryPoints
		}
		scopeAdded := sprint.StartDate != nil && issue.CreatedAt.After(*sprint.StartDate)
		if scopeAdded {
			resp.ScopeAdded = append(resp.ScopeAdded, issue)
		} else {
			resp.CommittedIssues++
			resp.CommittedPoints += pts
		}
		if doneSet[string(issue.Status)] {
			resp.Completed = append(resp.Completed, issue)
			if !scopeAdded {
				resp.DeliveredIssues++
				resp.DeliveredPoints += pts
			}
		} else {
			resp.NotCompleted = append(resp.NotCompleted, issue)
		}
	}
	if resp.Completed == nil {
		resp.Completed = []models.Issue{}
	}
	if resp.NotCompleted == nil {
		resp.NotCompleted = []models.Issue{}
	}
	if resp.ScopeAdded == nil {
		resp.ScopeAdded = []models.Issue{}
	}
	c.JSON(http.StatusOK, resp)
}
