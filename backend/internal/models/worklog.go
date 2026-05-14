package models

import "time"

// Worklog is a single time entry on an issue. Minutes are the unit of record
// everywhere; the UI parses human strings like "1h 30m" -> 90.
type Worklog struct {
	Base
	IssueID     uint      `gorm:"index;not null" json:"issue_id"`
	UserID      uint      `gorm:"not null" json:"user_id"`
	User        *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Minutes     int       `gorm:"not null" json:"minutes"`
	StartedAt   time.Time `gorm:"not null" json:"started_at"`
	Description string    `gorm:"type:text" json:"description"`
}
