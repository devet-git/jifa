package models

// RecentView records the last time a user opened an issue. Composite unique
// key on (user_id, issue_id) so each pair gets at most one row — we update
// the timestamp on revisit rather than inserting duplicates.
type RecentView struct {
	Base
	UserID  uint `gorm:"not null;uniqueIndex:idx_recent_user_issue" json:"user_id"`
	IssueID uint `gorm:"not null;uniqueIndex:idx_recent_user_issue" json:"issue_id"`
}
