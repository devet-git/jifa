package models

import (
	"time"
)

type IssueType string
type IssuePriority string
type IssueStatus string

const (
	IssueTypeTask    IssueType = "task"
	IssueTypeBug     IssueType = "bug"
	IssueTypeStory   IssueType = "story"
	IssueTypeEpic    IssueType = "epic"
	IssueTypeSubtask IssueType = "subtask"

	PriorityLow      IssuePriority = "low"
	PriorityMedium   IssuePriority = "medium"
	PriorityHigh     IssuePriority = "high"
	PriorityUrgent   IssuePriority = "urgent"

	StatusTodo       IssueStatus = "todo"
	StatusInProgress IssueStatus = "in_progress"
	StatusInReview   IssueStatus = "in_review"
	StatusDone       IssueStatus = "done"
)

type Issue struct {
	Base
	Number      uint          `gorm:"index;not null" json:"number"`
	Rank        float64       `gorm:"index;not null;default:0" json:"rank"`
	Title       string        `gorm:"not null" json:"title"`
	Description string        `json:"description"`
	Type        IssueType     `gorm:"default:'task'" json:"type"`
	Status      IssueStatus   `gorm:"default:'todo'" json:"status"`
	Priority    IssuePriority `gorm:"default:'medium'" json:"priority"`
	StoryPoints *int          `json:"story_points"`
	StartDate   *time.Time    `json:"start_date"`
	DueDate     *time.Time    `json:"due_date"`
	Color       string        `gorm:"size:7" json:"color"` // epics only; hex like #a78bfa

	// Time tracking. All in minutes. TimeSpent is denormalised — kept in
	// sync by the worklog handler whenever an entry is created/updated.
	OriginalEstimate *int `json:"original_estimate"`
	TimeSpent        int  `gorm:"not null;default:0" json:"time_spent"`

	ProjectID  uint     `json:"project_id"`
	Project    Project  `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	SprintID   *uint    `json:"sprint_id"`
	Sprint     *Sprint  `gorm:"foreignKey:SprintID" json:"sprint,omitempty"`
	VersionID  *uint    `gorm:"index" json:"version_id"`
	Version    *Version `gorm:"foreignKey:VersionID" json:"version,omitempty"`
	AssigneeID *uint    `json:"assignee_id"`
	Assignee   *User    `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	ReporterID uint     `json:"reporter_id"`
	Reporter   User     `gorm:"foreignKey:ReporterID" json:"reporter,omitempty"`
	ParentID   *uint    `json:"parent_id"`
	SubIssues  []Issue  `gorm:"foreignKey:ParentID" json:"sub_issues,omitempty"`

	Comments   []Comment      `json:"comments,omitempty"`
	Labels     []Label        `gorm:"many2many:issue_labels" json:"labels,omitempty"`
	Components []Component    `gorm:"many2many:issue_components" json:"components,omitempty"`
	Watchers   []IssueWatcher `json:"watchers,omitempty"`

	Key string `gorm:"-" json:"key"`
}
