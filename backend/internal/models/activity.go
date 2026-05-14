package models

// IssueActivity records a single field-level change on an issue. Comments are
// stored separately (Comment model); this is purely for system-level audits.
type IssueActivity struct {
	Base
	IssueID  uint   `gorm:"index;not null" json:"issue_id"`
	UserID   uint   `gorm:"index;not null" json:"user_id"`
	Field    string `gorm:"not null;size:50" json:"field"`
	OldValue string `gorm:"type:text" json:"old_value"`
	NewValue string `gorm:"type:text" json:"new_value"`
	User     *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
