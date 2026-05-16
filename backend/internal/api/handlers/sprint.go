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
		respondInternal(c, err)
		return
	}
	webhook.Dispatch(h.db, sprint.ProjectID, models.EventSprintCreated, sprint)
	c.JSON(http.StatusCreated, sprint)
}

func (h *SprintHandler) Update(c *gin.Context) {
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sprint not found"})
		return
	}
	// Preserve the commitment snapshot — it's a frozen audit record, not
	// editable via the regular Update endpoint.
	preservedSnapshot := sprint.CommitmentSnapshot
	c.ShouldBindJSON(&sprint)
	sprint.CommitmentSnapshot = preservedSnapshot
	h.db.Save(&sprint)
	webhook.Dispatch(h.db, sprint.ProjectID, models.EventSprintUpdated, sprint)
	c.JSON(http.StatusOK, sprint)
}

// Start transitions a sprint to "active" and freezes its commitment: the
// current set of issues + their story points are snapshot into
// CommitmentSnapshot and become the source of truth for retrospective
// metrics. Re-starting a sprint overwrites the snapshot — by design, so a
// mistaken start can be corrected.
func (h *SprintHandler) Start(c *gin.Context) {
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sprint not found"})
		return
	}

	var issues []models.Issue
	h.db.Select("id, story_points").
		Where("sprint_id = ?", sprint.ID).
		Find(&issues)

	snapshot := models.SprintCommitment{
		IssueIDs:        make([]uint, 0, len(issues)),
		PointsByIssue:   make(map[uint]int, len(issues)),
		SnapshotTakenAt: time.Now(),
	}
	for _, issue := range issues {
		pts := 0
		if issue.StoryPoints != nil {
			pts = *issue.StoryPoints
		}
		snapshot.IssueIDs = append(snapshot.IssueIDs, issue.ID)
		snapshot.PointsByIssue[issue.ID] = pts
		snapshot.TotalIssues++
		snapshot.TotalPoints += pts
	}

	now := time.Now()
	sprint.Status = models.SprintActive
	sprint.StartDate = &now
	sprint.CommitmentSnapshot = &snapshot
	if err := h.db.Save(&sprint).Error; err != nil {
		respondInternal(c, err)
		return
	}

	webhook.Dispatch(h.db, sprint.ProjectID, models.EventSprintStarted, sprint)
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
	HasSnapshot     bool           `json:"has_snapshot"`
	CommittedPoints int            `json:"committed_points"`
	DeliveredPoints int            `json:"delivered_points"`
	CommittedIssues int            `json:"committed_issues"`
	DeliveredIssues int            `json:"delivered_issues"`
	// Completed = committed issues that reached a Done-category status by the
	// time of the retrospective.
	Completed []models.Issue `json:"completed"`
	// NotCompleted = committed issues that did NOT reach Done. Includes issues
	// that were removed from the sprint after start (they live in Removed too).
	NotCompleted []models.Issue `json:"not_completed"`
	// ScopeAdded = issues currently in the sprint that were NOT in the
	// commitment snapshot — i.e. added mid-sprint.
	ScopeAdded []models.Issue `json:"scope_added"`
	// ScopeAddedCompleted = subset of ScopeAdded that reached Done.
	ScopeAddedCompleted []models.Issue `json:"scope_added_completed"`
	// Removed = issues that WERE committed but have been moved out of the
	// sprint (sprint_id changed) before the retrospective.
	Removed []models.Issue `json:"removed"`
}

func (h *SprintHandler) Retrospective(c *gin.Context) {
	var sprint models.Sprint
	if err := h.db.First(&sprint, c.Param("sprintId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sprint not found"})
		return
	}

	// Issues currently assigned to this sprint.
	var current []models.Issue
	h.db.Preload("Assignee").
		Where("sprint_id = ?", sprint.ID).
		Find(&current)

	// Resolve done-category status keys for this project.
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

	resp := sprintRetroResponse{
		Sprint:              sprint,
		Completed:           []models.Issue{},
		NotCompleted:        []models.Issue{},
		ScopeAdded:          []models.Issue{},
		ScopeAddedCompleted: []models.Issue{},
		Removed:             []models.Issue{},
	}

	// Fast path for sprints that were never started: fall back to "current set"
	// semantics so the retrospective still shows something useful.
	snap := sprint.CommitmentSnapshot
	if snap == nil {
		resp.HasSnapshot = false
		for _, issue := range current {
			pts := 0
			if issue.StoryPoints != nil {
				pts = *issue.StoryPoints
			}
			resp.CommittedIssues++
			resp.CommittedPoints += pts
			if doneSet[string(issue.Status)] {
				resp.Completed = append(resp.Completed, issue)
				resp.DeliveredIssues++
				resp.DeliveredPoints += pts
			} else {
				resp.NotCompleted = append(resp.NotCompleted, issue)
			}
		}
		c.JSON(http.StatusOK, resp)
		return
	}

	resp.HasSnapshot = true
	resp.CommittedIssues = snap.TotalIssues
	resp.CommittedPoints = snap.TotalPoints

	committedSet := make(map[uint]bool, len(snap.IssueIDs))
	for _, id := range snap.IssueIDs {
		committedSet[id] = true
	}

	// Index current issues by ID for the "removed" pass.
	currentByID := make(map[uint]models.Issue, len(current))
	for _, issue := range current {
		currentByID[issue.ID] = issue
	}

	// Walk current set: bucket into Completed / NotCompleted / ScopeAdded.
	for _, issue := range current {
		isDone := doneSet[string(issue.Status)]
		if committedSet[issue.ID] {
			if isDone {
				resp.Completed = append(resp.Completed, issue)
				resp.DeliveredIssues++
				resp.DeliveredPoints += snap.PointsByIssue[issue.ID]
			} else {
				resp.NotCompleted = append(resp.NotCompleted, issue)
			}
		} else {
			resp.ScopeAdded = append(resp.ScopeAdded, issue)
			if isDone {
				resp.ScopeAddedCompleted = append(resp.ScopeAddedCompleted, issue)
			}
		}
	}

	// Find committed issues that are no longer in the sprint.
	if len(committedSet) > 0 {
		missingIDs := make([]uint, 0)
		for id := range committedSet {
			if _, stillThere := currentByID[id]; !stillThere {
				missingIDs = append(missingIDs, id)
			}
		}
		if len(missingIDs) > 0 {
			var removed []models.Issue
			h.db.Preload("Assignee").
				Where("id IN ?", missingIDs).
				Find(&removed)
			resp.Removed = removed
		}
	}

	c.JSON(http.StatusOK, resp)
}
