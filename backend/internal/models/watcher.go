package models

// IssueWatcher is the join row representing a user watching an issue.
type IssueWatcher struct {
	Base
	IssueID uint  `gorm:"not null;uniqueIndex:idx_watcher_unique" json:"issue_id"`
	UserID  uint  `gorm:"not null;uniqueIndex:idx_watcher_unique" json:"user_id"`
	User    *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
