package models

type Label struct {
	Base
	Name      string  `gorm:"not null" json:"name"`
	Color     string  `gorm:"default:'#6366f1'" json:"color"`
	ProjectID uint    `json:"project_id"`
	Issues    []Issue `gorm:"many2many:issue_labels" json:"-"`
}
