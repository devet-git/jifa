package models

// StatusCategory groups statuses semantically. Reports key off the category,
// not the status name, so a project can rename or split its "in progress" or
// "done" statuses without breaking velocity/burndown calculations.
type StatusCategory string

const (
	CategoryTodo       StatusCategory = "todo"
	CategoryInProgress StatusCategory = "in_progress"
	CategoryDone       StatusCategory = "done"
)

// StatusDefinition is a project-scoped status. Issue.Status stores the key
// (e.g. "in_review"), and the row tells the UI/reports how to render and
// classify it.
type StatusDefinition struct {
	Base
	ProjectID uint           `gorm:"index;not null;uniqueIndex:idx_status_project_key" json:"project_id"`
	Key       string         `gorm:"not null;size:50;uniqueIndex:idx_status_project_key" json:"key"`
	Name      string         `gorm:"not null;size:80" json:"name"`
	Category  StatusCategory `gorm:"not null;size:20" json:"category"`
	Color     string         `gorm:"size:7" json:"color"`
	OrderIdx  int            `gorm:"not null;default:0" json:"order_idx"`
}

func ValidStatusCategory(c StatusCategory) bool {
	switch c {
	case CategoryTodo, CategoryInProgress, CategoryDone:
		return true
	}
	return false
}

// DefaultStatusSeed is the set of statuses every new project starts with.
// Key values match the legacy IssueStatus enum so existing logic and data
// don't need migration.
var DefaultStatusSeed = []StatusDefinition{
	{Key: "todo", Name: "To Do", Category: CategoryTodo, Color: "#9ca3af", OrderIdx: 0},
	{Key: "in_progress", Name: "In Progress", Category: CategoryInProgress, Color: "#3b82f6", OrderIdx: 1},
	{Key: "in_review", Name: "In Review", Category: CategoryInProgress, Color: "#f59e0b", OrderIdx: 2},
	{Key: "done", Name: "Done", Category: CategoryDone, Color: "#22c55e", OrderIdx: 3},
}
