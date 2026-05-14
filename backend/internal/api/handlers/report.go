package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"time"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ReportHandler struct{ db *gorm.DB }

func NewReportHandler(db *gorm.DB) *ReportHandler { return &ReportHandler{db: db} }

type velocityEntry struct {
	SprintID        uint   `json:"sprint_id"`
	SprintName      string `json:"sprint_name"`
	CompletedAt     string `json:"completed_at"`
	CommittedPoints int    `json:"committed_points"`
	CompletedPoints int    `json:"completed_points"`
	CommittedCount  int    `json:"committed_count"`
	CompletedCount  int    `json:"completed_count"`
}

// Velocity returns the last N completed sprints' committed vs completed
// points for the project. "Completed in sprint" = currently has status=done
// and is assigned to that sprint. (Without per-issue closed-in-sprint
// snapshots, this is the closest signal we have.)
func (h *ReportHandler) Velocity(c *gin.Context) {
	pid := c.Param("projectId")

	var sprints []models.Sprint
	h.db.Where("project_id = ? AND status = ?", pid, models.SprintComplete).
		Order("completed_at DESC NULLS LAST, end_date DESC").
		Limit(10).
		Find(&sprints)

	out := make([]velocityEntry, 0, len(sprints))
	for _, s := range sprints {
		var issues []models.Issue
		h.db.Select("id, status, story_points, project_id").
			Where("sprint_id = ?", s.ID).
			Find(&issues)
		entry := velocityEntry{SprintID: s.ID, SprintName: s.Name}
		if s.CompletedAt != nil {
			entry.CompletedAt = s.CompletedAt.UTC().Format(time.RFC3339)
		}
		for _, i := range issues {
			entry.CommittedCount++
			if i.StoryPoints != nil {
				entry.CommittedPoints += *i.StoryPoints
			}
			if IsStatusInCategory(h.db, i.ProjectID, string(i.Status), models.CategoryDone) {
				entry.CompletedCount++
				if i.StoryPoints != nil {
					entry.CompletedPoints += *i.StoryPoints
				}
			}
		}
		out = append(out, entry)
	}

	// Reverse so the oldest sprint is first (left-to-right chart order).
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}

	c.JSON(http.StatusOK, out)
}

type burndownPoint struct {
	Date      string `json:"date"`
	Remaining int    `json:"remaining"`
	Ideal     int    `json:"ideal"`
}

// Burndown returns one data point per day from sprint.start_date up to
// min(sprint.end_date, today) for an active or completed sprint. Each point
// records the remaining (uncompleted) story points at end-of-day.
//
// Completion timestamps come from IssueActivity entries with field="status"
// and new_value="done". If an issue has no such entry but is currently done,
// it's treated as having completed at issue.updated_at.
func (h *ReportHandler) Burndown(c *gin.Context) {
	sid := c.Param("sprintId")

	var sprint models.Sprint
	if err := h.db.First(&sprint, sid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sprint not found"})
		return
	}
	if sprint.StartDate == nil {
		c.JSON(http.StatusOK, []burndownPoint{})
		return
	}

	var issues []models.Issue
	h.db.Select("id, status, story_points, updated_at").
		Where("sprint_id = ?", sprint.ID).
		Find(&issues)

	// Total committed points (issues in this sprint with points).
	total := 0
	for _, i := range issues {
		if i.StoryPoints != nil {
			total += *i.StoryPoints
		}
	}

	// Resolve when each issue first became done (any "done" category status).
	// Look up the project's done-category keys to handle custom workflows.
	var doneKeys []string
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ? AND category = ?", sprint.ProjectID, models.CategoryDone).
		Pluck("key", &doneKeys)
	if len(doneKeys) == 0 {
		doneKeys = []string{string(models.StatusDone)}
	}
	doneKeySet := map[string]bool{}
	for _, k := range doneKeys {
		doneKeySet[k] = true
	}

	doneAt := map[uint]time.Time{}
	for _, i := range issues {
		if !doneKeySet[string(i.Status)] {
			continue
		}
		var act models.IssueActivity
		err := h.db.Where(
			"issue_id = ? AND field = 'status' AND new_value IN ?", i.ID, doneKeys,
		).Order("created_at DESC").First(&act).Error
		if err == nil {
			doneAt[i.ID] = act.CreatedAt
		} else {
			doneAt[i.ID] = i.UpdatedAt
		}
	}

	pointsByIssue := map[uint]int{}
	for _, i := range issues {
		if i.StoryPoints != nil {
			pointsByIssue[i.ID] = *i.StoryPoints
		}
	}

	// Build days from start..end (inclusive). Cap end at today for an active
	// sprint so future points stay blank.
	start := dayOf(*sprint.StartDate)
	var end time.Time
	switch {
	case sprint.EndDate != nil:
		end = dayOf(*sprint.EndDate)
	case sprint.CompletedAt != nil:
		end = dayOf(*sprint.CompletedAt)
	default:
		end = dayOf(time.Now())
	}
	today := dayOf(time.Now())
	if sprint.Status == models.SprintActive && end.After(today) {
		// still draw the ideal line all the way to end, but stop remaining at today
	}

	days := []time.Time{}
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		days = append(days, d)
	}
	if len(days) == 0 {
		c.JSON(http.StatusOK, []burndownPoint{})
		return
	}
	// Sort doneAt timestamps for deterministic remaining calc.
	type doneEvent struct {
		At     time.Time
		Points int
	}
	events := make([]doneEvent, 0, len(doneAt))
	for id, t := range doneAt {
		events = append(events, doneEvent{At: t, Points: pointsByIssue[id]})
	}
	sort.Slice(events, func(i, j int) bool { return events[i].At.Before(events[j].At) })

	idealStep := 0.0
	if n := len(days); n > 1 {
		idealStep = float64(total) / float64(n-1)
	}

	points := make([]burndownPoint, 0, len(days))
	for idx, d := range days {
		// remaining = total - sum(points of issues done on or before d)
		completed := 0
		eod := d.Add(24 * time.Hour)
		for _, e := range events {
			if e.At.Before(eod) {
				completed += e.Points
			}
		}
		bp := burndownPoint{
			Date:  d.Format("2006-01-02"),
			Ideal: int(float64(total) - float64(idx)*idealStep + 0.5),
		}
		// For future days (after today on an active sprint) don't draw
		// a real remaining value — leave it equal to the latest known.
		if sprint.Status == models.SprintActive && d.After(today) {
			bp.Remaining = -1
		} else {
			bp.Remaining = total - completed
		}
		points = append(points, bp)
	}

	c.JSON(http.StatusOK, points)
}

func dayOf(t time.Time) time.Time {
	t = t.UTC()
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

type cycleEntry struct {
	IssueID     uint    `json:"issue_id"`
	Key         string  `json:"key"`
	Title       string  `json:"title"`
	CompletedAt string  `json:"completed_at"`
	CycleHours  float64 `json:"cycle_hours"`
}

// CycleTime returns one row per recently-completed issue with the elapsed
// hours from its first "in progress" transition to its first "done"
// transition. Issues that never visited an in-progress state are skipped —
// they cannot be measured.
type workloadEntry struct {
	UserID         *uint  `json:"user_id"`
	UserName       string `json:"user_name"`
	OpenCount      int    `json:"open_count"`
	InProgressCnt  int    `json:"in_progress_count"`
	DoneCount      int    `json:"done_count"`
	TotalCount     int    `json:"total_count"`
	OpenPoints     int    `json:"open_points"`
	InProgressPts  int    `json:"in_progress_points"`
	DonePoints     int    `json:"done_points"`
	TotalPoints    int    `json:"total_points"`
}

// Workload aggregates issue counts and story points per assignee for a
// project. Issues with no assignee are bucketed under user_id = nil ("Unassigned").
// "Open" = todo category, "InProgress" = in_progress category, "Done" =
// done category.
func (h *ReportHandler) Workload(c *gin.Context) {
	pid := c.Param("projectId")

	// Build category lookup so custom statuses are bucketed correctly.
	var statuses []models.StatusDefinition
	h.db.Where("project_id = ?", pid).Find(&statuses)
	categoryOf := map[string]models.StatusCategory{}
	for _, s := range statuses {
		categoryOf[s.Key] = s.Category
	}
	// Fallback for projects whose statuses haven't been seeded yet.
	if _, ok := categoryOf[string(models.StatusTodo)]; !ok {
		categoryOf[string(models.StatusTodo)] = models.CategoryTodo
		categoryOf[string(models.StatusInProgress)] = models.CategoryInProgress
		categoryOf[string(models.StatusInReview)] = models.CategoryInProgress
		categoryOf[string(models.StatusDone)] = models.CategoryDone
	}

	var issues []models.Issue
	h.db.Preload("Assignee").
		Select("id, status, story_points, assignee_id, project_id").
		Where("project_id = ?", pid).
		Find(&issues)

	buckets := map[uint]*workloadEntry{}
	var unassigned *workloadEntry
	for _, i := range issues {
		var e *workloadEntry
		if i.AssigneeID == nil {
			if unassigned == nil {
				unassigned = &workloadEntry{UserName: "Unassigned"}
			}
			e = unassigned
		} else {
			b, ok := buckets[*i.AssigneeID]
			if !ok {
				name := "User #" + fmt.Sprint(*i.AssigneeID)
				if i.Assignee != nil && i.Assignee.Name != "" {
					name = i.Assignee.Name
				}
				uid := *i.AssigneeID
				b = &workloadEntry{UserID: &uid, UserName: name}
				buckets[*i.AssigneeID] = b
			}
			e = b
		}

		points := 0
		if i.StoryPoints != nil {
			points = *i.StoryPoints
		}
		e.TotalCount++
		e.TotalPoints += points
		switch categoryOf[string(i.Status)] {
		case models.CategoryInProgress:
			e.InProgressCnt++
			e.InProgressPts += points
		case models.CategoryDone:
			e.DoneCount++
			e.DonePoints += points
		default:
			e.OpenCount++
			e.OpenPoints += points
		}
	}

	out := make([]workloadEntry, 0, len(buckets)+1)
	for _, e := range buckets {
		out = append(out, *e)
	}
	// Sort assigned users by open+inprogress count (active workload) desc.
	sort.Slice(out, func(i, j int) bool {
		ai := out[i].OpenCount + out[i].InProgressCnt
		aj := out[j].OpenCount + out[j].InProgressCnt
		if ai != aj {
			return ai > aj
		}
		return out[i].UserName < out[j].UserName
	})
	if unassigned != nil {
		out = append(out, *unassigned)
	}
	c.JSON(http.StatusOK, out)
}

func (h *ReportHandler) CycleTime(c *gin.Context) {
	pid := c.Param("projectId")
	var project models.Project
	if err := h.db.First(&project, pid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	// Resolve category keys for this project's workflow.
	var doneKeys, progressKeys []string
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ? AND category = ?", project.ID, models.CategoryDone).
		Pluck("key", &doneKeys)
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ? AND category = ?", project.ID, models.CategoryInProgress).
		Pluck("key", &progressKeys)
	if len(doneKeys) == 0 {
		doneKeys = []string{string(models.StatusDone)}
	}
	if len(progressKeys) == 0 {
		progressKeys = []string{string(models.StatusInProgress), string(models.StatusInReview)}
	}

	// Done-category issues touched in the last 90 days.
	since := time.Now().Add(-90 * 24 * time.Hour)
	var issues []models.Issue
	h.db.Where(
		"project_id = ? AND status IN ? AND updated_at >= ?",
		project.ID, doneKeys, since,
	).Order("updated_at DESC").Limit(200).Find(&issues)

	out := make([]cycleEntry, 0, len(issues))
	for _, i := range issues {
		var startAct models.IssueActivity
		if err := h.db.Where(
			"issue_id = ? AND field = 'status' AND new_value IN ?", i.ID, progressKeys,
		).Order("created_at ASC").First(&startAct).Error; err != nil {
			continue
		}
		var doneAct models.IssueActivity
		if err := h.db.Where(
			"issue_id = ? AND field = 'status' AND new_value IN ? AND created_at >= ?",
			i.ID, doneKeys, startAct.CreatedAt,
		).Order("created_at ASC").First(&doneAct).Error; err != nil {
			continue
		}
		hours := doneAct.CreatedAt.Sub(startAct.CreatedAt).Hours()
		if hours < 0 {
			continue
		}
		out = append(out, cycleEntry{
			IssueID:     i.ID,
			Key:         fmt.Sprintf("%s-%d", project.Key, i.Number),
			Title:       i.Title,
			CompletedAt: doneAct.CreatedAt.UTC().Format(time.RFC3339),
			CycleHours:  hours,
		})
	}
	c.JSON(http.StatusOK, out)
}

type cfdPoint struct {
	Date   string         `json:"date"`
	Counts map[string]int `json:"counts"`
}

func (h *ReportHandler) CFD(c *gin.Context) {
	pid := c.Param("projectId")
	var project models.Project
	if err := h.db.First(&project, pid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	var issues []models.Issue
	h.db.Where("project_id = ?", project.ID).Select("id, status, created_at").Find(&issues)
	if len(issues) == 0 {
		c.JSON(http.StatusOK, []cfdPoint{})
		return
	}
	issueIDs := make([]uint, len(issues))
	initialStatus := make(map[uint]string)
	for i, iss := range issues {
		issueIDs[i] = iss.ID
		initialStatus[iss.ID] = string(iss.Status)
	}
	type statusEvent struct {
		IssueID   uint
		NewValue  string
		CreatedAt time.Time
	}
	var events []statusEvent
	h.db.Model(&models.IssueActivity{}).
		Select("issue_id, new_value, created_at").
		Where("issue_id IN ? AND field = 'status'", issueIDs).
		Order("created_at ASC").
		Find(&events)
	type transition struct {
		At     time.Time
		Status string
	}
	timeline := make(map[uint][]transition, len(issues))
	for _, ev := range events {
		timeline[ev.IssueID] = append(timeline[ev.IssueID], transition{ev.CreatedAt, ev.NewValue})
	}
	days := 30
	now := time.Now().UTC()
	out := make([]cfdPoint, days)
	for d := 0; d < days; d++ {
		day := now.AddDate(0, 0, d-days+1)
		eod := time.Date(day.Year(), day.Month(), day.Day(), 23, 59, 59, 0, time.UTC)
		counts := map[string]int{}
		for _, iss := range issues {
			if iss.CreatedAt.After(eod) {
				continue
			}
			st := initialStatus[iss.ID]
			for _, tr := range timeline[iss.ID] {
				if tr.At.After(eod) {
					break
				}
				st = tr.Status
			}
			counts[st]++
		}
		out[d] = cfdPoint{Date: day.Format("2006-01-02"), Counts: counts}
	}
	c.JSON(http.StatusOK, out)
}

type timeInStatusEntry struct {
	StatusKey  string  `json:"status_key"`
	StatusName string  `json:"status_name"`
	AvgHours   float64 `json:"avg_hours"`
	Count      int     `json:"count"`
}

func (h *ReportHandler) TimeInStatus(c *gin.Context) {
	pid := c.Param("projectId")
	var project models.Project
	if err := h.db.First(&project, pid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	var defs []models.StatusDefinition
	h.db.Where("project_id = ?", project.ID).Find(&defs)
	nameOf := make(map[string]string, len(defs))
	for _, d := range defs {
		nameOf[d.Key] = d.Name
	}
	since := time.Now().Add(-90 * 24 * time.Hour)
	var issues []models.Issue
	h.db.Where("project_id = ? AND created_at >= ?", project.ID, since).
		Select("id, status, created_at").Find(&issues)
	if len(issues) == 0 {
		c.JSON(http.StatusOK, []timeInStatusEntry{})
		return
	}
	issueIDs := make([]uint, len(issues))
	for i, iss := range issues {
		issueIDs[i] = iss.ID
	}
	type actRow struct {
		IssueID   uint
		OldValue  string
		NewValue  string
		CreatedAt time.Time
	}
	var acts []actRow
	h.db.Model(&models.IssueActivity{}).
		Select("issue_id, old_value, new_value, created_at").
		Where("issue_id IN ? AND field = 'status'", issueIDs).
		Order("issue_id, created_at ASC").
		Find(&acts)
	issueCreated := make(map[uint]time.Time, len(issues))
	for _, iss := range issues {
		issueCreated[iss.ID] = iss.CreatedAt
	}
	type accum struct {
		total float64
		count int
	}
	totals := map[string]*accum{}
	ensure := func(key string) {
		if _, ok := totals[key]; !ok {
			totals[key] = &accum{}
		}
	}
	type issueState struct{ prev time.Time }
	grouped := make(map[uint]*issueState, len(issues))
	for _, a := range acts {
		if _, ok := grouped[a.IssueID]; !ok {
			grouped[a.IssueID] = &issueState{prev: issueCreated[a.IssueID]}
		}
		g := grouped[a.IssueID]
		hours := a.CreatedAt.Sub(g.prev).Hours()
		if hours > 0 && a.OldValue != "" {
			ensure(a.OldValue)
			totals[a.OldValue].total += hours
			totals[a.OldValue].count++
		}
		g.prev = a.CreatedAt
	}
	for _, iss := range issues {
		g, ok := grouped[iss.ID]
		var hours float64
		if !ok {
			hours = time.Since(issueCreated[iss.ID]).Hours()
		} else {
			hours = time.Since(g.prev).Hours()
		}
		ensure(string(iss.Status))
		totals[string(iss.Status)].total += hours
		totals[string(iss.Status)].count++
	}
	out := make([]timeInStatusEntry, 0, len(totals))
	for key, acc := range totals {
		if acc.count == 0 {
			continue
		}
		name := nameOf[key]
		if name == "" {
			name = key
		}
		out = append(out, timeInStatusEntry{
			StatusKey:  key,
			StatusName: name,
			AvgHours:   acc.total / float64(acc.count),
			Count:      acc.count,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].AvgHours > out[j].AvgHours })
	c.JSON(http.StatusOK, out)
}

type controlChartPoint struct {
	IssueID       uint    `json:"issue_id"`
	Key           string  `json:"key"`
	Title         string  `json:"title"`
	CompletedDate string  `json:"completed_date"`
	CycleDays     float64 `json:"cycle_days"`
}

// ControlChart returns one point per completed issue showing cycle-time
// variation over time — useful for spotting process instability.
func (h *ReportHandler) ControlChart(c *gin.Context) {
	pid := c.Param("projectId")
	var project models.Project
	if err := h.db.First(&project, pid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	var doneKeys, progressKeys []string
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ? AND category = ?", project.ID, models.CategoryDone).
		Pluck("key", &doneKeys)
	h.db.Model(&models.StatusDefinition{}).
		Where("project_id = ? AND category = ?", project.ID, models.CategoryInProgress).
		Pluck("key", &progressKeys)
	if len(doneKeys) == 0 {
		doneKeys = []string{string(models.StatusDone)}
	}
	if len(progressKeys) == 0 {
		progressKeys = []string{string(models.StatusInProgress), string(models.StatusInReview)}
	}

	since := time.Now().Add(-180 * 24 * time.Hour)
	q := h.db.Where("project_id = ? AND status IN ? AND updated_at >= ?", project.ID, doneKeys, since).
		Order("updated_at ASC").Limit(500)
	if from := c.Query("from"); from != "" {
		q = q.Where("updated_at >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		q = q.Where("updated_at <= ?", to)
	}
	var issues []models.Issue
	q.Find(&issues)

	out := make([]controlChartPoint, 0, len(issues))
	for _, i := range issues {
		var startAct models.IssueActivity
		if err := h.db.Where(
			"issue_id = ? AND field = 'status' AND new_value IN ?", i.ID, progressKeys,
		).Order("created_at ASC").First(&startAct).Error; err != nil {
			continue
		}
		var doneAct models.IssueActivity
		if err := h.db.Where(
			"issue_id = ? AND field = 'status' AND new_value IN ? AND created_at >= ?",
			i.ID, doneKeys, startAct.CreatedAt,
		).Order("created_at ASC").First(&doneAct).Error; err != nil {
			continue
		}
		days := doneAct.CreatedAt.Sub(startAct.CreatedAt).Hours() / 24
		if days < 0 {
			continue
		}
		out = append(out, controlChartPoint{
			IssueID:       i.ID,
			Key:           fmt.Sprintf("%s-%d", project.Key, i.Number),
			Title:         i.Title,
			CompletedDate: doneAct.CreatedAt.UTC().Format("2006-01-02"),
			CycleDays:     days,
		})
	}
	c.JSON(http.StatusOK, out)
}
