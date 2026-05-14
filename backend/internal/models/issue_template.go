package models

type IssueTemplate struct {
	Base
	ProjectID   uint          `gorm:"index;not null" json:"project_id"`
	Name        string        `gorm:"not null;size:120" json:"name"`
	IssueType   IssueType     `gorm:"size:20;default:'task'" json:"issue_type"`
	Title       string        `gorm:"size:255" json:"title"`
	Description string        `gorm:"type:text" json:"description"`
	Priority    IssuePriority `gorm:"size:20;default:'medium'" json:"priority"`
	StoryPoints *int          `json:"story_points"`
}
