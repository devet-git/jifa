package models

// Component is a project-scoped sub-grouping (e.g. "Frontend", "Payments").
// Issues can belong to multiple components.
type Component struct {
	Base
	ProjectID   uint   `gorm:"index;not null" json:"project_id"`
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	LeadID      *uint  `json:"lead_id"`
	Lead        *User  `gorm:"foreignKey:LeadID" json:"lead,omitempty"`

	Issues []Issue `gorm:"many2many:issue_components" json:"-"`
}
