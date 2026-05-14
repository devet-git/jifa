package models

// WebhookEvent is the type of event that fires a webhook.
type WebhookEvent string

const (
	EventIssueCreated   WebhookEvent = "issue.created"
	EventIssueUpdated   WebhookEvent = "issue.updated"
	EventIssueDeleted   WebhookEvent = "issue.deleted"
	EventCommentCreated WebhookEvent = "comment.created"
	EventSprintStarted  WebhookEvent = "sprint.started"
	EventSprintCompleted WebhookEvent = "sprint.completed"
)

// AllWebhookEvents lists every event the server can dispatch.
var AllWebhookEvents = []WebhookEvent{
	EventIssueCreated,
	EventIssueUpdated,
	EventIssueDeleted,
	EventCommentCreated,
	EventSprintStarted,
	EventSprintCompleted,
}

type Webhook struct {
	Base
	ProjectID uint   `gorm:"index;not null" json:"project_id"`
	URL       string `gorm:"not null" json:"url"`
	Secret    string `gorm:"not null" json:"-"`           // never returned in payloads
	Events    string `gorm:"type:text;not null" json:"events"` // comma-separated
	Active    bool   `gorm:"not null;default:true" json:"active"`
}
