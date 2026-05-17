package models

// IssueActivity records a single field-level change on an issue. Comments are
// stored separately (Comment model); this is purely for system-level audits.
//
// UserID is nullable so system-initiated actions (e.g. GitLab webhook
// transitions) don't violate the FK to users(id).
type IssueActivity struct {
	Base
	IssueID  uint   `gorm:"index;not null" json:"issue_id"`
	UserID   *uint  `gorm:"index" json:"user_id"`
	Field    string `gorm:"not null;size:50" json:"field"`
	OldValue string `gorm:"type:text" json:"old_value"`
	NewValue string `gorm:"type:text" json:"new_value"`
	User     *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
