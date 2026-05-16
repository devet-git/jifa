package models

import "time"

type Project struct {
	Base
	Name        string `gorm:"not null" json:"name"`
	Key         string `gorm:"uniqueIndex;not null;size:10" json:"key"` // e.g. "JIFA"
	Description string `json:"description"`
	OwnerID     uint   `json:"owner_id"`
	Owner       User   `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`

	// ArchivedAt marks the project as read-only. Archived projects are
	// hidden from default listings, reject mutations at the API boundary,
	// and can be restored by any user with project.edit. Hard deletion is
	// separate and reserved for the project owner.
	ArchivedAt *time.Time `gorm:"index" json:"archived_at,omitempty"`

	Sprints []Sprint `json:"sprints,omitempty"`
	Issues  []Issue  `json:"issues,omitempty"`
	Members []Member `json:"members,omitempty"`

	// DateFormat controls how dates are displayed project-wide.
	// Default: "MMM DD, YYYY" (e.g. "Jan 15, 2025").
	DateFormat string `gorm:"not null;default:'MMM DD, YYYY'" json:"date_format"`
	// TimeFormat controls how times are displayed project-wide.
	// Default: "h:mm A" (e.g. "2:30 PM").
	TimeFormat string `gorm:"not null;default:'h:mm A'" json:"time_format"`

	// IssueSeq is the last allocated per-project issue number. Incremented
	// transactionally on issue create.
	IssueSeq uint `gorm:"not null;default:0" json:"-"`

	// Category is an optional grouping label for organizing projects in the
	// sidebar. Projects with the same category are displayed together.
	Category string `json:"category"`
}
