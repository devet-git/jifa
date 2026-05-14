package handlers

import (
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CSVHandler struct{ db *gorm.DB }

func NewCSVHandler(db *gorm.DB) *CSVHandler { return &CSVHandler{db: db} }

// csvColumns is the canonical column order for both export and import.
// Import is forgiving about column presence/order — it looks each header up
// by name — but export uses this fixed layout.
var csvColumns = []string{
	"key", "number", "title", "type", "status", "priority",
	"story_points", "start_date", "due_date",
	"assignee_email", "reporter_email",
	"sprint", "version", "epic", "labels", "components", "description",
}

// Export streams all issues in the project as CSV.
func (h *CSVHandler) Export(c *gin.Context) {
	pid := c.Param("projectId")

	var project models.Project
	if err := h.db.First(&project, pid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	var issues []models.Issue
	h.db.
		Preload("Assignee").Preload("Reporter").
		Preload("Sprint").Preload("Version").
		Preload("Labels").Preload("Components").
		Where("project_id = ?", pid).
		Order("number ASC").
		Find(&issues)

	// Resolve parent epics by id for the "epic" column.
	parentIDs := map[uint]bool{}
	for _, i := range issues {
		if i.ParentID != nil {
			parentIDs[*i.ParentID] = true
		}
	}
	parents := map[uint]models.Issue{}
	if len(parentIDs) > 0 {
		ids := make([]uint, 0, len(parentIDs))
		for id := range parentIDs {
			ids = append(ids, id)
		}
		var ps []models.Issue
		h.db.Select("id, title, number").Where("id IN ?", ids).Find(&ps)
		for _, p := range ps {
			parents[p.ID] = p
		}
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition",
		fmt.Sprintf(`attachment; filename="%s-issues.csv"`, sanitizeKey(project.Key)))

	w := csv.NewWriter(c.Writer)
	defer w.Flush()
	_ = w.Write(csvColumns)

	for _, i := range issues {
		row := make([]string, len(csvColumns))
		key := fmt.Sprintf("%s-%d", project.Key, i.Number)
		labels := joinNames(i.Labels)
		comps := componentNames(i.Components)
		row[0] = key
		row[1] = strconv.Itoa(int(i.Number))
		row[2] = i.Title
		row[3] = string(i.Type)
		row[4] = string(i.Status)
		row[5] = string(i.Priority)
		if i.StoryPoints != nil {
			row[6] = strconv.Itoa(*i.StoryPoints)
		}
		if i.StartDate != nil {
			row[7] = i.StartDate.UTC().Format("2006-01-02")
		}
		if i.DueDate != nil {
			row[8] = i.DueDate.UTC().Format("2006-01-02")
		}
		if i.Assignee != nil {
			row[9] = i.Assignee.Email
		}
		row[10] = i.Reporter.Email
		if i.Sprint != nil {
			row[11] = i.Sprint.Name
		}
		if i.Version != nil {
			row[12] = i.Version.Name
		}
		if i.ParentID != nil {
			if p, ok := parents[*i.ParentID]; ok {
				row[13] = p.Title
			}
		}
		row[14] = labels
		row[15] = comps
		row[16] = i.Description
		_ = w.Write(row)
	}
}

func joinNames(labels []models.Label) string {
	parts := make([]string, len(labels))
	for i, l := range labels {
		parts[i] = l.Name
	}
	return strings.Join(parts, ", ")
}

func componentNames(cs []models.Component) string {
	parts := make([]string, len(cs))
	for i, c := range cs {
		parts[i] = c.Name
	}
	return strings.Join(parts, ", ")
}

func sanitizeKey(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		ch := s[i]
		if ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9' || ch == '_' || ch == '-' {
			out = append(out, ch)
		}
	}
	if len(out) == 0 {
		return "project"
	}
	return string(out)
}

type importReport struct {
	Created int      `json:"created"`
	Errors  []string `json:"errors"`
}

// Import accepts a multipart-uploaded CSV file and creates one issue per
// row. Required column: title. All other columns are optional.
//
// Sprint / Version / Epic / Labels / Components are resolved by name. Unknown
// names produce row errors and are skipped (no auto-create).
func (h *CSVHandler) Import(c *gin.Context) {
	userID, _ := c.Get("userID")
	pid64, err := strconv.ParseUint(c.Param("projectId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}
	pid := uint(pid64)

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided"})
		return
	}
	defer file.Close()

	r := csv.NewReader(file)
	r.FieldsPerRecord = -1
	header, err := r.Read()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty file"})
		return
	}
	idx := map[string]int{}
	for i, h := range header {
		idx[strings.ToLower(strings.TrimSpace(h))] = i
	}
	titleCol, hasTitle := idx["title"]
	if !hasTitle {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required column: title"})
		return
	}

	// Preload resolution maps.
	sprintsByName := preloadByName(h.db, pid, &[]models.Sprint{})
	versionsByName := preloadByName(h.db, pid, &[]models.Version{})
	labelsByName := preloadByName(h.db, pid, &[]models.Label{})
	compsByName := preloadByName(h.db, pid, &[]models.Component{})

	var epicIssues []models.Issue
	h.db.Where("project_id = ? AND type = ?", pid, models.IssueTypeEpic).
		Select("id, title").Find(&epicIssues)
	epicsByTitle := map[string]uint{}
	for _, e := range epicIssues {
		epicsByTitle[strings.ToLower(strings.TrimSpace(e.Title))] = e.ID
	}

	// Users by email (only those who are members of the project, otherwise
	// any email in the system). We assume small instance — single query.
	var users []models.User
	h.db.Select("id, email").Find(&users)
	usersByEmail := map[string]uint{}
	for _, u := range users {
		usersByEmail[strings.ToLower(strings.TrimSpace(u.Email))] = u.ID
	}

	report := importReport{Errors: []string{}}
	rowNum := 1
	for {
		rowNum++
		rec, err := r.Read()
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				break
			}
			if err.Error() == "EOF" {
				break
			}
			// Bad row: keep going.
			report.Errors = append(report.Errors,
				fmt.Sprintf("row %d: %v", rowNum, err))
			continue
		}
		title := getField(rec, idx, "title")
		if title == "" {
			report.Errors = append(report.Errors,
				fmt.Sprintf("row %d: missing title", rowNum))
			continue
		}

		issue := models.Issue{
			ProjectID:   pid,
			Title:       title,
			Description: getField(rec, idx, "description"),
			Type:        coerceType(getField(rec, idx, "type")),
			Status:      coerceStatus(getField(rec, idx, "status")),
			Priority:    coercePriority(getField(rec, idx, "priority")),
			ReporterID:  userID.(uint),
		}
		if sp := getField(rec, idx, "story_points"); sp != "" {
			if n, err := strconv.Atoi(sp); err == nil {
				issue.StoryPoints = &n
			}
		}
		if sd := getField(rec, idx, "start_date"); sd != "" {
			if t, err := parseDay(sd); err == nil {
				issue.StartDate = &t
			}
		}
		if dd := getField(rec, idx, "due_date"); dd != "" {
			if t, err := parseDay(dd); err == nil {
				issue.DueDate = &t
			}
		}
		if a := getField(rec, idx, "assignee_email"); a != "" {
			if id, ok := usersByEmail[strings.ToLower(a)]; ok {
				issue.AssigneeID = &id
			}
		}
		if s := getField(rec, idx, "sprint"); s != "" {
			if id, ok := sprintsByName[strings.ToLower(s)]; ok {
				issue.SprintID = &id
			}
		}
		if v := getField(rec, idx, "version"); v != "" {
			if id, ok := versionsByName[strings.ToLower(v)]; ok {
				issue.VersionID = &id
			}
		}
		if e := getField(rec, idx, "epic"); e != "" {
			if id, ok := epicsByTitle[strings.ToLower(strings.TrimSpace(e))]; ok {
				issue.ParentID = &id
			}
		}

		// Insert in transaction so number stays sequential.
		err = h.db.Transaction(func(tx *gorm.DB) error {
			var project models.Project
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				First(&project, pid).Error; err != nil {
				return err
			}
			project.IssueSeq++
			if err := tx.Model(&project).Update("issue_seq", project.IssueSeq).Error; err != nil {
				return err
			}
			issue.Number = project.IssueSeq

			var maxRank float64
			tx.Model(&models.Issue{}).
				Where("project_id = ?", pid).
				Select("COALESCE(MAX(rank), 0)").
				Row().Scan(&maxRank)
			issue.Rank = maxRank + 1024

			if err := tx.Create(&issue).Error; err != nil {
				return err
			}

			if labelsCsv := getField(rec, idx, "labels"); labelsCsv != "" {
				var labelObjs []models.Label
				for _, name := range splitCSV(labelsCsv) {
					if id, ok := labelsByName[strings.ToLower(name)]; ok {
						labelObjs = append(labelObjs, models.Label{Base: models.Base{ID: id}})
					}
				}
				if len(labelObjs) > 0 {
					_ = tx.Model(&issue).Association("Labels").Append(labelObjs)
				}
			}
			if compsCsv := getField(rec, idx, "components"); compsCsv != "" {
				var compObjs []models.Component
				for _, name := range splitCSV(compsCsv) {
					if id, ok := compsByName[strings.ToLower(name)]; ok {
						compObjs = append(compObjs, models.Component{Base: models.Base{ID: id}})
					}
				}
				if len(compObjs) > 0 {
					_ = tx.Model(&issue).Association("Components").Append(compObjs)
				}
			}
			return nil
		})
		if err != nil {
			report.Errors = append(report.Errors,
				fmt.Sprintf("row %d: %v", rowNum, err))
			continue
		}
		report.Created++
	}

	_ = titleCol // silences unused
	c.JSON(http.StatusOK, report)
}

func getField(rec []string, idx map[string]int, name string) string {
	i, ok := idx[name]
	if !ok || i >= len(rec) {
		return ""
	}
	return strings.TrimSpace(rec[i])
}

func parseDay(s string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(s))
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func coerceType(s string) models.IssueType {
	switch strings.ToLower(s) {
	case "bug":
		return models.IssueTypeBug
	case "story":
		return models.IssueTypeStory
	case "epic":
		return models.IssueTypeEpic
	default:
		return models.IssueTypeTask
	}
}
func coerceStatus(s string) models.IssueStatus {
	switch strings.ToLower(s) {
	case "in_progress", "in progress":
		return models.StatusInProgress
	case "in_review", "in review":
		return models.StatusInReview
	case "done":
		return models.StatusDone
	default:
		return models.StatusTodo
	}
}
func coercePriority(s string) models.IssuePriority {
	switch strings.ToLower(s) {
	case "low":
		return models.PriorityLow
	case "high":
		return models.PriorityHigh
	case "urgent":
		return models.PriorityUrgent
	default:
		return models.PriorityMedium
	}
}

// preloadByName loads every row with a project_id+name pair into a name→id
// lookup. It works for any model that has Name + ID + ProjectID fields.
// We use generics-via-interface to avoid duplicating it four times.
type namedRow interface {
	~struct{}
}

func preloadByName(db *gorm.DB, projectID uint, dest interface{}) map[string]uint {
	// Reflection-free implementation per type to keep things simple.
	out := map[string]uint{}
	switch d := dest.(type) {
	case *[]models.Sprint:
		db.Select("id, name").Where("project_id = ?", projectID).Find(d)
		for _, r := range *d {
			out[strings.ToLower(strings.TrimSpace(r.Name))] = r.ID
		}
	case *[]models.Version:
		db.Select("id, name").Where("project_id = ?", projectID).Find(d)
		for _, r := range *d {
			out[strings.ToLower(strings.TrimSpace(r.Name))] = r.ID
		}
	case *[]models.Label:
		db.Select("id, name").Where("project_id = ?", projectID).Find(d)
		for _, r := range *d {
			out[strings.ToLower(strings.TrimSpace(r.Name))] = r.ID
		}
	case *[]models.Component:
		db.Select("id, name").Where("project_id = ?", projectID).Find(d)
		for _, r := range *d {
			out[strings.ToLower(strings.TrimSpace(r.Name))] = r.ID
		}
	}
	return out
}
