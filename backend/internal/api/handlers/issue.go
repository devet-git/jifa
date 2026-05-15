package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type IssueHandler struct{ db *gorm.DB }

func NewIssueHandler(db *gorm.DB) *IssueHandler { return &IssueHandler{db: db} }

// rankStep is the gap used when appending or when rebalance prevents a
// midpoint. Small enough that doubles can represent millions of moves before
// running out of precision.
const rankStep = 1024.0

// rebalanceThreshold — if the gap between two neighbouring ranks falls below
// this, we rebalance the affected project's issues.
const rebalanceThreshold = 1e-6

// loadPermissionsForProject returns the user's effective permission set for a
// project. The owner gets everything; non-owners are resolved through their
// member RoleID. Returns nil if the user has no access.
func loadPermissionsForProject(db *gorm.DB, userID, projectID uint) map[string]bool {
	var project models.Project
	if err := db.Select("id, owner_id").First(&project, projectID).Error; err != nil {
		return nil
	}
	if project.OwnerID == userID {
		var all []models.Permission
		db.Find(&all)
		m := make(map[string]bool, len(all))
		for _, p := range all {
			m[p.Key] = true
		}
		return m
	}
	var member models.Member
	if err := db.Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error; err != nil {
		return nil
	}
	var keys []string
	db.Table("role_permissions").
		Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ?", member.RoleID).
		Pluck("permissions.key", &keys)
	m := make(map[string]bool, len(keys))
	for _, k := range keys {
		m[k] = true
	}
	return m
}

// setIssueKey builds the human-readable key from the issue's project.
func setIssueKey(issue *models.Issue) {
	if issue.Project.Key != "" {
		issue.Key = issue.Project.Key + "-" + strconv.Itoa(int(issue.Number))
	}
}

// createIssueDTO is the whitelisted payload for issue creation.
type createIssueDTO struct {
	ProjectID   uint                 `json:"project_id" binding:"required"`
	Title       string               `json:"title" binding:"required"`
	Description string               `json:"description"`
	Type        models.IssueType     `json:"type"`
	Status      models.IssueStatus   `json:"status"`
	Priority    models.IssuePriority `json:"priority"`
	StoryPoints *int                 `json:"story_points"`
	DueDate     *time.Time           `json:"due_date"`
	SprintID    *uint                `json:"sprint_id"`
	AssigneeID  *uint                `json:"assignee_id"`
	ParentID    *uint                `json:"parent_id"`
	VersionID        *uint  `json:"version_id"`
	Color            string `json:"color"`
	OriginalEstimate *int       `json:"original_estimate"`
	StartDate        *time.Time `json:"start_date"`
}

// updateIssueDTO is the whitelist for partial updates. All pointer fields so
// nil means "do not change".
type updateIssueDTO struct {
	Title         *string               `json:"title"`
	Description   *string               `json:"description"`
	Type          *models.IssueType     `json:"type"`
	Status        *models.IssueStatus   `json:"status"`
	Priority      *models.IssuePriority `json:"priority"`
	StoryPoints   *int                  `json:"story_points"`
	DueDate       *time.Time            `json:"due_date"`
	SprintID      *uint                 `json:"sprint_id"`
	AssigneeID    *uint                 `json:"assignee_id"`
	ParentID      *uint                 `json:"parent_id"`
	VersionID        *uint   `json:"version_id"`
	Color            *string `json:"color"`
	OriginalEstimate *int      `json:"original_estimate"`
	StartDate        *time.Time `json:"start_date"`
	ClearStart       bool       `json:"clear_start"`
	ClearSprint   bool                  `json:"clear_sprint"`
	ClearDue      bool                  `json:"clear_due"`
	ClearAssignee bool                  `json:"clear_assignee"`
	ClearParent   bool                  `json:"clear_parent"`
	ClearVersion  bool                  `json:"clear_version"`
}

func (h *IssueHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	var issues []models.Issue
	q := h.db.Preload("Assignee").Preload("Reporter").Preload("Labels").Preload("Project")

	// Restrict to projects the user can see.
	q = q.Joins("LEFT JOIN members m ON m.project_id = issues.project_id AND m.deleted_at IS NULL").
		Joins("LEFT JOIN projects p_acl ON p_acl.id = issues.project_id").
		Where("p_acl.owner_id = ? OR m.user_id = ?", userID, userID).
		Distinct("issues.*")

	if pid := c.Query("project_id"); pid != "" {
		pidNum, err := strconv.ParseUint(pid, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project_id"})
			return
		}
		perms := loadPermissionsForProject(h.db, userID.(uint), uint(pidNum))
		if perms == nil || !perms["issue.view"] {
			c.JSON(http.StatusOK, []models.Issue{})
			return
		}
		q = q.Where("issues.project_id = ?", pid)
	} else if sid := c.Query("sprint_id"); sid != "" && sid != "none" {
		var sprint models.Sprint
		if err := h.db.Select("id, project_id").First(&sprint, sid).Error; err == nil {
			perms := loadPermissionsForProject(h.db, userID.(uint), sprint.ProjectID)
			if perms == nil || !perms["issue.view"] {
				c.JSON(http.StatusOK, []models.Issue{})
				return
			}
		}
	}
	if sid := c.Query("sprint_id"); sid != "" {
		if sid == "none" {
			q = q.Where("issues.sprint_id IS NULL")
		} else {
			q = q.Where("issues.sprint_id = ?", sid)
		}
	}
	if status := c.Query("status"); status != "" {
		q = q.Where("issues.status = ?", status)
	}
	if t := c.Query("type"); t != "" {
		q = q.Where("issues.type = ?", t)
	}
	if p := c.Query("priority"); p != "" {
		q = q.Where("issues.priority = ?", p)
	}
	if aid := c.Query("assignee_id"); aid != "" {
		q = q.Where("issues.assignee_id = ?", aid)
	}
	if from := c.Query("due_date_from"); from != "" {
		q = q.Where("issues.due_date >= ?", from)
	}
	if to := c.Query("due_date_to"); to != "" {
		q = q.Where("issues.due_date <= ?", to)
	}
	q.Order("issues.rank ASC, issues.id ASC").Find(&issues)
	for i := range issues {
		setIssueKey(&issues[i])
	}
	c.JSON(http.StatusOK, issues)
}

func (h *IssueHandler) Create(c *gin.Context) {
	userID, _ := c.Get("userID")
	var dto createIssueDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	perms := loadPermissionsForProject(h.db, userID.(uint), dto.ProjectID)
	if perms == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	if !perms["issue.create"] {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	// Enforce required fields per issue type.
	if dto.Type == models.IssueTypeStory && dto.StoryPoints == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "story_points is required for story type"})
		return
	}

	issue := models.Issue{
		ProjectID:   dto.ProjectID,
		Title:       dto.Title,
		Description: dto.Description,
		Type:        dto.Type,
		Status:      dto.Status,
		Priority:    dto.Priority,
		StoryPoints: dto.StoryPoints,
		DueDate:     dto.DueDate,
		SprintID:    dto.SprintID,
		AssigneeID:  dto.AssigneeID,
		ParentID:    dto.ParentID,
		VersionID:        dto.VersionID,
		Color:            dto.Color,
		OriginalEstimate: dto.OriginalEstimate,
		StartDate:        dto.StartDate,
		ReporterID:       userID.(uint),
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var project models.Project
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&project, dto.ProjectID).Error; err != nil {
			return err
		}
		project.IssueSeq++
		if err := tx.Model(&project).Update("issue_seq", project.IssueSeq).Error; err != nil {
			return err
		}
		issue.Number = project.IssueSeq

		// Append to end: rank = (max rank in project) + rankStep.
		var maxRank float64
		tx.Model(&models.Issue{}).
			Where("project_id = ?", dto.ProjectID).
			Select("COALESCE(MAX(rank), 0)").
			Row().Scan(&maxRank)
		issue.Rank = maxRank + rankStep
		return tx.Create(&issue).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_ = EnsureWatcher(h.db, issue.ID, userID.(uint))
	if issue.AssigneeID != nil {
		_ = EnsureWatcher(h.db, issue.ID, *issue.AssigneeID)
	}

	h.db.Preload("Project").Preload("Reporter").First(&issue, issue.ID)
	setIssueKey(&issue)
	webhook.Dispatch(h.db, issue.ProjectID, models.EventIssueCreated, issue)
	c.JSON(http.StatusCreated, issue)
}

func (h *IssueHandler) Get(c *gin.Context) {
	userID, _ := c.Get("userID")
	var issue models.Issue
	err := h.db.Preload("Assignee").Preload("Reporter").Preload("Comments.Author").
		Preload("Labels").Preload("SubIssues").Preload("Project").First(&issue, c.Param("id")).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}
	setIssueKey(&issue)

	// Fire-and-forget upsert into the recent-views table.
	go upsertRecentView(h.db, userID.(uint), issue.ID)

	c.JSON(http.StatusOK, issue)
}

func upsertRecentView(db *gorm.DB, userID, issueID uint) {
	var rv models.RecentView
	err := db.Where("user_id = ? AND issue_id = ?", userID, issueID).
		First(&rv).Error
	if err == nil {
		db.Save(&rv) // bumps updated_at
		return
	}
	_ = db.Create(&models.RecentView{UserID: userID, IssueID: issueID}).Error
}

func (h *IssueHandler) Update(c *gin.Context) {
	userID, _ := c.Get("userID")
	var issue models.Issue
	if err := h.db.First(&issue, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}
	var dto updateIssueDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	old := issue
	updates := map[string]any{}
	if dto.Title != nil {
		updates["title"] = *dto.Title
	}
	if dto.Description != nil {
		updates["description"] = *dto.Description
	}
	if dto.Type != nil {
		updates["type"] = *dto.Type
	}
	if dto.Status != nil {
		updates["status"] = *dto.Status
	}
	if dto.Priority != nil {
		updates["priority"] = *dto.Priority
	}
	if dto.StoryPoints != nil {
		updates["story_points"] = *dto.StoryPoints
	}
	if dto.Color != nil {
		updates["color"] = *dto.Color
	}
	if dto.ClearAssignee {
		updates["assignee_id"] = nil
	} else if dto.AssigneeID != nil {
		updates["assignee_id"] = *dto.AssigneeID
	}
	if dto.ClearParent {
		updates["parent_id"] = nil
	} else if dto.ParentID != nil {
		updates["parent_id"] = *dto.ParentID
	}
	if dto.ClearSprint {
		updates["sprint_id"] = nil
	} else if dto.SprintID != nil {
		updates["sprint_id"] = *dto.SprintID
	}
	if dto.ClearDue {
		updates["due_date"] = nil
	} else if dto.DueDate != nil {
		updates["due_date"] = *dto.DueDate
	}
	if dto.ClearVersion {
		updates["version_id"] = nil
	} else if dto.VersionID != nil {
		updates["version_id"] = *dto.VersionID
	}
	if dto.OriginalEstimate != nil {
		updates["original_estimate"] = *dto.OriginalEstimate
	}
	if dto.ClearStart {
		updates["start_date"] = nil
	} else if dto.StartDate != nil {
		updates["start_date"] = *dto.StartDate
	}

	if len(updates) > 0 {
		if err := h.db.Model(&issue).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	h.db.Preload("Project").Preload("Assignee").Preload("Reporter").First(&issue, issue.ID)
	logIssueDiff(h.db, userID.(uint), old, issue)

	// Assignee changed: auto-watch + notify new assignee.
	if issue.AssigneeID != nil && (old.AssigneeID == nil || *old.AssigneeID != *issue.AssigneeID) {
		_ = EnsureWatcher(h.db, issue.ID, *issue.AssigneeID)
		dispatch(h.db, &models.Notification{
			UserID:  *issue.AssigneeID,
			Type:    models.NotifAssigned,
			IssueID: &issue.ID,
			Body:    issue.Title,
		}, userID.(uint))
	}

	// Status change reaches every watcher.
	if dto.Status != nil && string(old.Status) != string(issue.Status) {
		dispatchToWatchers(h.db, issue.ID, userID.(uint), func(uid uint) *models.Notification {
			return &models.Notification{
				UserID:  uid,
				Type:    models.NotifStatusChange,
				IssueID: &issue.ID,
				Body:    string(old.Status) + " → " + string(issue.Status),
			}
		})
	}

	setIssueKey(&issue)
	if len(updates) > 0 {
		webhook.Dispatch(h.db, issue.ProjectID, models.EventIssueUpdated, issue)
	}
	c.JSON(http.StatusOK, issue)
}

// logIssueDiff emits one IssueActivity row per field that changed.
func logIssueDiff(db *gorm.DB, userID uint, oldI, newI models.Issue) {
	logActivity(db, newI.ID, userID, "title", oldI.Title, newI.Title)
	logActivity(db, newI.ID, userID, "description", oldI.Description, newI.Description)
	logActivity(db, newI.ID, userID, "type", string(oldI.Type), string(newI.Type))
	logActivity(db, newI.ID, userID, "status", string(oldI.Status), string(newI.Status))
	logActivity(db, newI.ID, userID, "priority", string(oldI.Priority), string(newI.Priority))
	logActivity(db, newI.ID, userID, "story_points", oldI.StoryPoints, newI.StoryPoints)
	logActivity(db, newI.ID, userID, "due_date", oldI.DueDate, newI.DueDate)
	logActivity(db, newI.ID, userID, "assignee_id", oldI.AssigneeID, newI.AssigneeID)
	logActivity(db, newI.ID, userID, "sprint_id", oldI.SprintID, newI.SprintID)
	logActivity(db, newI.ID, userID, "parent_id", oldI.ParentID, newI.ParentID)
	logActivity(db, newI.ID, userID, "color", oldI.Color, newI.Color)
}

// Clone duplicates an issue into the same project. Copies whitelisted fields
// plus labels and components. Subtasks and comments are NOT copied — they
// rarely make sense for a duplicate. The new issue gets a fresh issue number
// and a "Copy of …" title prefix.
func (h *IssueHandler) Clone(c *gin.Context) {
	userID, _ := c.Get("userID")

	var src models.Issue
	if err := h.db.Preload("Labels").Preload("Components").
		First(&src, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}

	clone := models.Issue{
		ProjectID:        src.ProjectID,
		Title:            "Copy of " + src.Title,
		Description:      src.Description,
		Type:             src.Type,
		Status:           models.StatusTodo,
		Priority:         src.Priority,
		StoryPoints:      src.StoryPoints,
		DueDate:          src.DueDate,
		StartDate:        src.StartDate,
		SprintID:         src.SprintID,
		VersionID:        src.VersionID,
		AssigneeID:       src.AssigneeID,
		ParentID:         src.ParentID,
		Color:            src.Color,
		OriginalEstimate: src.OriginalEstimate,
		ReporterID:       userID.(uint),
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var project models.Project
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&project, src.ProjectID).Error; err != nil {
			return err
		}
		project.IssueSeq++
		if err := tx.Model(&project).Update("issue_seq", project.IssueSeq).Error; err != nil {
			return err
		}
		clone.Number = project.IssueSeq

		var maxRank float64
		tx.Model(&models.Issue{}).
			Where("project_id = ?", src.ProjectID).
			Select("COALESCE(MAX(rank), 0)").
			Row().Scan(&maxRank)
		clone.Rank = maxRank + rankStep

		if err := tx.Create(&clone).Error; err != nil {
			return err
		}
		// many2many copies — replace handles the join table inserts.
		if len(src.Labels) > 0 {
			if err := tx.Model(&clone).Association("Labels").Replace(src.Labels); err != nil {
				return err
			}
		}
		if len(src.Components) > 0 {
			if err := tx.Model(&clone).Association("Components").Replace(src.Components); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_ = EnsureWatcher(h.db, clone.ID, userID.(uint))

	h.db.Preload("Project").Preload("Reporter").Preload("Assignee").
		Preload("Labels").Preload("Components").First(&clone, clone.ID)
	setIssueKey(&clone)
	webhook.Dispatch(h.db, clone.ProjectID, models.EventIssueCreated, clone)
	c.JSON(http.StatusCreated, clone)
}

func (h *IssueHandler) Delete(c *gin.Context) {
	var issue models.Issue
	if err := h.db.Select("id, project_id").First(&issue, c.Param("id")).Error; err == nil {
		webhook.Dispatch(h.db, issue.ProjectID, models.EventIssueDeleted,
			gin.H{"id": issue.ID})
	}
	h.db.Delete(&models.Issue{}, c.Param("id"))
	c.Status(http.StatusNoContent)
}

type bulkRequest struct {
	IssueIDs []uint `json:"issue_ids" binding:"required,min=1"`
	Patch    struct {
		Status        *models.IssueStatus   `json:"status"`
		Priority      *models.IssuePriority `json:"priority"`
		Type          *models.IssueType     `json:"type"`
		AssigneeID    *uint                 `json:"assignee_id"`
		SprintID      *uint                 `json:"sprint_id"`
		VersionID     *uint                 `json:"version_id"`
		ParentID      *uint                 `json:"parent_id"`
		ClearAssignee bool                  `json:"clear_assignee"`
		ClearSprint   bool                  `json:"clear_sprint"`
		ClearVersion  bool                  `json:"clear_version"`
		ClearParent   bool                  `json:"clear_parent"`
	} `json:"patch"`
	Delete bool `json:"delete"`
}

// Bulk applies a whitelisted patch (or delete) to many issues at once. The
// caller must have member role on every issue's project; any issue that fails
// the auth check is skipped silently.
func (h *IssueHandler) Bulk(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req bulkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Load minimal issue info to authorise per project.
	var issues []models.Issue
	h.db.Select("id, project_id, status, assignee_id, sprint_id").
		Where("id IN ?", req.IssueIDs).Find(&issues)

	// Cache permission lookups per project.
	permCache := map[uint]map[string]bool{}
	allowed := make([]uint, 0, len(issues))
	requiredPerm := "issue.edit"
	if req.Delete {
		requiredPerm = "issue.delete"
	}
	for _, i := range issues {
		perms, ok := permCache[i.ProjectID]
		if !ok {
			perms = loadPermissionsForProject(h.db, userID.(uint), i.ProjectID)
			permCache[i.ProjectID] = perms
		}
		if perms != nil && perms[requiredPerm] {
			allowed = append(allowed, i.ID)
		}
	}
	if len(allowed) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "no editable issues"})
		return
	}

	if req.Delete {
		h.db.Where("id IN ?", allowed).Delete(&models.Issue{})
		c.JSON(http.StatusOK, gin.H{"affected": len(allowed)})
		return
	}

	updates := map[string]any{}
	if req.Patch.Status != nil {
		updates["status"] = *req.Patch.Status
	}
	if req.Patch.Priority != nil {
		updates["priority"] = *req.Patch.Priority
	}
	if req.Patch.Type != nil {
		updates["type"] = *req.Patch.Type
	}
	if req.Patch.ClearAssignee {
		updates["assignee_id"] = nil
	} else if req.Patch.AssigneeID != nil {
		updates["assignee_id"] = *req.Patch.AssigneeID
	}
	if req.Patch.ClearSprint {
		updates["sprint_id"] = nil
	} else if req.Patch.SprintID != nil {
		updates["sprint_id"] = *req.Patch.SprintID
	}
	if req.Patch.ClearVersion {
		updates["version_id"] = nil
	} else if req.Patch.VersionID != nil {
		updates["version_id"] = *req.Patch.VersionID
	}
	if req.Patch.ClearParent {
		updates["parent_id"] = nil
	} else if req.Patch.ParentID != nil {
		updates["parent_id"] = *req.Patch.ParentID
	}
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty patch"})
		return
	}

	if err := h.db.Model(&models.Issue{}).
		Where("id IN ?", allowed).
		Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"affected": len(allowed)})
}

func (h *IssueHandler) UpdateStatus(c *gin.Context) {
	userID, _ := c.Get("userID")
	var body struct {
		Status models.IssueStatus `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var current models.Issue
	if err := h.db.Select("id, status").First(&current, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}
	if err := h.db.Model(&models.Issue{}).Where("id = ?", current.ID).
		Update("status", body.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	logActivity(h.db, current.ID, userID.(uint), "status",
		string(current.Status), string(body.Status))

	if string(current.Status) != string(body.Status) {
		dispatchToWatchers(h.db, current.ID, userID.(uint), func(uid uint) *models.Notification {
			return &models.Notification{
				UserID:  uid,
				Type:    models.NotifStatusChange,
				IssueID: &current.ID,
				Body:    string(current.Status) + " → " + string(body.Status),
			}
		})
	}
	c.JSON(http.StatusOK, gin.H{"status": body.Status})
}

type rankRequest struct {
	BeforeID    *uint `json:"before_id"`
	AfterID     *uint `json:"after_id"`
	SprintID    *uint `json:"sprint_id"`
	ClearSprint bool  `json:"clear_sprint"`
}

// Rank moves an issue to a new position. The caller specifies the neighbour
// issues it should sit between (before_id = issue currently above, after_id =
// issue currently below). Optionally re-assigns the sprint at the same time.
func (h *IssueHandler) Rank(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req rankRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var issue models.Issue
	if err := h.db.First(&issue, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}
	oldSprintID := issue.SprintID

	err := h.db.Transaction(func(tx *gorm.DB) error {
		// Resolve neighbour ranks. Both neighbours must be in the same project
		// (and in the target sprint after the move).
		var beforeRank, afterRank *float64

		if req.BeforeID != nil {
			var n models.Issue
			if err := tx.Select("id, rank, project_id").
				First(&n, *req.BeforeID).Error; err != nil {
				return err
			}
			if n.ProjectID != issue.ProjectID {
				return errors.New("before_id is from a different project")
			}
			r := n.Rank
			beforeRank = &r
		}
		if req.AfterID != nil {
			var n models.Issue
			if err := tx.Select("id, rank, project_id").
				First(&n, *req.AfterID).Error; err != nil {
				return err
			}
			if n.ProjectID != issue.ProjectID {
				return errors.New("after_id is from a different project")
			}
			r := n.Rank
			afterRank = &r
		}

		newRank, needRebalance := computeRank(beforeRank, afterRank)
		updates := map[string]any{"rank": newRank}
		if req.ClearSprint {
			updates["sprint_id"] = nil
		} else if req.SprintID != nil {
			updates["sprint_id"] = *req.SprintID
		}
		if err := tx.Model(&issue).Updates(updates).Error; err != nil {
			return err
		}

		if needRebalance {
			if err := rebalanceProject(tx, issue.ProjectID); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.db.Preload("Project").Preload("Assignee").Preload("Reporter").
		First(&issue, issue.ID)

	// Sprint move shows up on the activity feed; pure reorders don't.
	if req.ClearSprint || req.SprintID != nil {
		logActivity(h.db, issue.ID, userID.(uint), "sprint_id", oldSprintID, issue.SprintID)
	}
	setIssueKey(&issue)
	c.JSON(http.StatusOK, issue)
}

// computeRank returns the new rank between two neighbours. needRebalance is
// true when the midpoint gap collapses below threshold; callers should
// rebalance the whole list when that happens.
func computeRank(before, after *float64) (float64, bool) {
	switch {
	case before == nil && after == nil:
		return rankStep, false
	case before == nil:
		return *after - rankStep, false
	case after == nil:
		return *before + rankStep, false
	default:
		gap := *after - *before
		if gap < rebalanceThreshold {
			return (*before + *after) / 2, true
		}
		return (*before + *after) / 2, false
	}
}

// rebalanceProject renumbers every issue in the project to evenly spaced
// ranks, preserving current order.
func rebalanceProject(tx *gorm.DB, projectID uint) error {
	var issues []models.Issue
	if err := tx.Select("id, rank").
		Where("project_id = ?", projectID).
		Order("rank ASC, id ASC").
		Find(&issues).Error; err != nil {
		return err
	}
	for i, iss := range issues {
		newRank := float64(i+1) * rankStep
		if err := tx.Model(&models.Issue{}).
			Where("id = ?", iss.ID).
			Update("rank", newRank).Error; err != nil {
			return err
		}
	}
	return nil
}

func (h *IssueHandler) AddComment(c *gin.Context) {
	userID, _ := c.Get("userID")
	var body struct {
		Body            string `json:"body" binding:"required"`
		MentionUserIDs  []uint `json:"mention_user_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	issueID := c.Param("id")
	var issue models.Issue
	if err := h.db.First(&issue, issueID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	comment := models.Comment{Body: body.Body, IssueID: issue.ID, AuthorID: userID.(uint)}
	h.db.Create(&comment)
	h.db.Preload("Author").First(&comment, comment.ID)
	webhook.Dispatch(h.db, issue.ProjectID, models.EventCommentCreated, gin.H{
		"issue_id": issue.ID,
		"comment":  comment,
	})

	// Mentions take precedence: a mentioned user gets a mention notification,
	// not a duplicate comment notification.
	mentioned := map[uint]bool{}
	for _, uid := range body.MentionUserIDs {
		if uid == 0 || uid == userID.(uint) {
			continue
		}
		mentioned[uid] = true
		dispatch(h.db, &models.Notification{
			UserID:    uid,
			Type:      models.NotifMention,
			IssueID:   &issue.ID,
			CommentID: &comment.ID,
			Body:      body.Body,
		}, userID.(uint))
		// Mentions auto-subscribe the user to future activity on the issue.
		_ = EnsureWatcher(h.db, issue.ID, uid)
	}

	// Notify the rest of the watchers (excluding the author and anyone
	// already getting a mention).
	dispatchToWatchers(h.db, issue.ID, userID.(uint), func(uid uint) *models.Notification {
		if mentioned[uid] {
			return nil
		}
		return &models.Notification{
			UserID:    uid,
			Type:      models.NotifComment,
			IssueID:   &issue.ID,
			CommentID: &comment.ID,
			Body:      body.Body,
		}
	})

	c.JSON(http.StatusCreated, comment)
}

// UpdateComment lets the comment author (or project admin) edit a comment body.
func (h *IssueHandler) UpdateComment(c *gin.Context) {
	userID, _ := c.Get("userID")
	var body struct {
		Body string `json:"body" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var comment models.Comment
	if err := h.db.First(&comment, c.Param("commentId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}
	perms, _ := c.Get("permissions")
	permMap, _ := perms.(map[string]bool)
	isCommentAdmin := permMap["project.edit"] || permMap["member.invite"]
	if comment.AuthorID != userID.(uint) && !isCommentAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the author or an admin can edit this comment"})
		return
	}
	h.db.Model(&comment).Update("body", body.Body)
	h.db.Preload("Author").First(&comment, comment.ID)
	c.JSON(http.StatusOK, comment)
}

// DeleteComment lets the comment author (or project admin) delete a comment.
func (h *IssueHandler) Convert(c *gin.Context) {
	userID, _ := c.Get("userID")
	var issue models.Issue
	if err := h.db.First(&issue, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "issue not found"})
		return
	}
	var req struct {
		Type models.IssueType `json:"type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if issue.Type == models.IssueTypeEpic {
		var childCount int64
		h.db.Model(&models.Issue{}).Where("parent_id = ?", issue.ID).Count(&childCount)
		if childCount > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot convert epic with child issues"})
			return
		}
	}
	oldType := string(issue.Type)
	if err := h.db.Model(&issue).Update("type", req.Type).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	logActivity(h.db, issue.ID, userID.(uint), "type", oldType, string(req.Type))
	h.db.Preload("Assignee").Preload("Reporter").Preload("Project").First(&issue, issue.ID)
	setIssueKey(&issue)
	c.JSON(http.StatusOK, issue)
}

func (h *IssueHandler) DeleteComment(c *gin.Context) {
	userID, _ := c.Get("userID")
	var comment models.Comment
	if err := h.db.First(&comment, c.Param("commentId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}
	perms, _ := c.Get("permissions")
	permMap, _ := perms.(map[string]bool)
	isCommentAdmin := permMap["project.edit"] || permMap["member.invite"]
	if comment.AuthorID != userID.(uint) && !isCommentAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the author or an admin can delete this comment"})
		return
	}
	h.db.Delete(&comment)
	c.Status(http.StatusNoContent)
}
