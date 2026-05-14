package models

import "time"

type NotificationType string

const (
	NotifComment       NotificationType = "comment"
	NotifMention       NotificationType = "mention"
	NotifAssigned      NotificationType = "assigned"
	NotifStatusChange  NotificationType = "status_change"
	NotifLinkAdded     NotificationType = "link_added"
)

type Notification struct {
	Base
	UserID    uint             `gorm:"index;not null" json:"user_id"` // recipient
	ActorID   *uint            `json:"actor_id"`
	Type      NotificationType `gorm:"not null;size:30" json:"type"`
	IssueID   *uint            `gorm:"index" json:"issue_id"`
	CommentID *uint            `json:"comment_id"`
	Body      string           `gorm:"type:text" json:"body"`
	ReadAt    *time.Time       `gorm:"index" json:"read_at"`

	Actor *User  `gorm:"foreignKey:ActorID" json:"actor,omitempty"`
	Issue *Issue `gorm:"foreignKey:IssueID" json:"issue,omitempty"`
}
