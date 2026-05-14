package models

import "time"

type SprintStatus string

const (
	SprintPlanned  SprintStatus = "planned"
	SprintActive   SprintStatus = "active"
	SprintComplete SprintStatus = "completed"
)

type Sprint struct {
	Base
	Name      string       `gorm:"not null" json:"name"`
	Goal      string       `json:"goal"`
	Status      SprintStatus `gorm:"default:'planned'" json:"status"`
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	CompletedAt *time.Time   `json:"completed_at"`

	ProjectID uint    `json:"project_id"`
	Issues    []Issue `gorm:"foreignKey:SprintID" json:"issues,omitempty"`
}
