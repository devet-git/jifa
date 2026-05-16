package models

// WebhookEvent is the type of event that fires a webhook.
type WebhookEvent string

const (
	// Issue lifecycle
	EventIssueCreated         WebhookEvent = "issue.created"
	EventIssueUpdated         WebhookEvent = "issue.updated"
	EventIssueDeleted         WebhookEvent = "issue.deleted"
	EventIssueStatusChanged   WebhookEvent = "issue.status_changed"
	EventIssueAssigned        WebhookEvent = "issue.assigned"
	EventIssueUnassigned      WebhookEvent = "issue.unassigned"
	EventIssuePriorityChanged WebhookEvent = "issue.priority_changed"
	EventIssueLinked          WebhookEvent = "issue.linked"
	EventIssueUnlinked        WebhookEvent = "issue.unlinked"

	// Comments
	EventCommentCreated   WebhookEvent = "comment.created"
	EventCommentUpdated   WebhookEvent = "comment.updated"
	EventCommentDeleted   WebhookEvent = "comment.deleted"
	EventCommentMentioned WebhookEvent = "comment.mentioned"

	// Sprint
	EventSprintCreated   WebhookEvent = "sprint.created"
	EventSprintUpdated   WebhookEvent = "sprint.updated"
	EventSprintStarted   WebhookEvent = "sprint.started"
	EventSprintCompleted WebhookEvent = "sprint.completed"

	// Version / release
	EventVersionCreated  WebhookEvent = "version.created"
	EventVersionReleased WebhookEvent = "version.released"

	// Member
	EventMemberAdded       WebhookEvent = "member.added"
	EventMemberRemoved     WebhookEvent = "member.removed"
	EventMemberRoleChanged WebhookEvent = "member.role_changed"

	// Worklog
	EventWorklogAdded   WebhookEvent = "worklog.added"
	EventWorklogDeleted WebhookEvent = "worklog.deleted"

	// Attachment
	EventAttachmentUploaded WebhookEvent = "attachment.uploaded"

	// Wiki page
	EventWikiPageCreated    WebhookEvent = "wiki_page.created"
	EventWikiPageUpdated    WebhookEvent = "wiki_page.updated"
	EventWikiPageDeleted    WebhookEvent = "wiki_page.deleted"

	// Wiki comment
	EventWikiCommentCreated   WebhookEvent = "wiki_comment.created"
	EventWikiCommentUpdated   WebhookEvent = "wiki_comment.updated"
	EventWikiCommentDeleted   WebhookEvent = "wiki_comment.deleted"
	EventWikiCommentMentioned WebhookEvent = "wiki_comment.mentioned"

	// Project
	EventProjectUpdated WebhookEvent = "project.updated"
)

// AllWebhookEvents lists every event the server can dispatch. Order matters
// because the UI renders chips in this order.
var AllWebhookEvents = []WebhookEvent{
	// Issue
	EventIssueCreated,
	EventIssueUpdated,
	EventIssueDeleted,
	EventIssueStatusChanged,
	EventIssueAssigned,
	EventIssueUnassigned,
	EventIssuePriorityChanged,
	EventIssueLinked,
	EventIssueUnlinked,
	// Comment
	EventCommentCreated,
	EventCommentUpdated,
	EventCommentDeleted,
	EventCommentMentioned,
	// Sprint
	EventSprintCreated,
	EventSprintUpdated,
	EventSprintStarted,
	EventSprintCompleted,
	// Version
	EventVersionCreated,
	EventVersionReleased,
	// Member
	EventMemberAdded,
	EventMemberRemoved,
	EventMemberRoleChanged,
	// Worklog
	EventWorklogAdded,
	EventWorklogDeleted,
	// Attachment
	EventAttachmentUploaded,
	// Wiki
	EventWikiPageCreated,
	EventWikiPageUpdated,
	EventWikiPageDeleted,
	// Wiki comment
	EventWikiCommentCreated,
	EventWikiCommentUpdated,
	EventWikiCommentDeleted,
	EventWikiCommentMentioned,
	// Project
	EventProjectUpdated,
}

// AuthType controls how a webhook authenticates with its endpoint.
type AuthType string

const (
	AuthNone   AuthType = "none"
	AuthBasic  AuthType = "basic"  // creds: "user:pass"
	AuthBearer AuthType = "bearer" // creds: "<token>"
	AuthHeader AuthType = "header" // creds: "<HeaderName>: <value>"
)

type Webhook struct {
	Base
	ProjectID uint   `gorm:"index;not null" json:"project_id"`
	Name      string `gorm:"type:varchar(200)" json:"name"`
	URL       string `gorm:"not null" json:"url"`
	Secret    string `gorm:"not null" json:"-"` // never returned in payloads

	// HTTP request shape
	Method      string `gorm:"not null;default:'POST'" json:"method"`
	ContentType string `gorm:"not null;default:'application/json'" json:"content_type"`

	// JSON-encoded map[string]string. Empty string when unset.
	Headers     string `gorm:"type:text;not null;default:''" json:"headers"`
	QueryParams string `gorm:"type:text;not null;default:''" json:"query_params"`

	// Authentication
	AuthType        AuthType `gorm:"not null;default:'none'" json:"auth_type"`
	AuthCredentials string   `gorm:"type:text;not null;default:''" json:"-"`

	// Payload body. Required at application layer (DTO validation) — the column
	// itself is nullable so AutoMigrate can add it on top of existing rows
	// without violating NOT NULL. BackfillWebhookDefaults() populates legacy
	// rows on boot.
	BodyTemplate string `gorm:"type:text" json:"body_template"`

	// BodyType decides how the request body is built:
	//   "template" — render BodyTemplate via text/template (default)
	//   "form"     — render each value in FormFields via text/template, then
	//                URL-encode and join as application/x-www-form-urlencoded.
	BodyType string `gorm:"type:varchar(20);default:'template'" json:"body_type"`

	// FormFields stores k → v template pairs (JSON map[string]string).
	// Only used when BodyType == "form".
	FormFields string `gorm:"type:text;default:''" json:"form_fields"`

	// comma-separated event names
	Events string `gorm:"type:text;not null" json:"events"`
	Active bool   `gorm:"not null;default:true" json:"active"`
}

// DefaultBodyTemplate is what we backfill existing rows with (preserves
// the legacy payload shape for webhooks created before this field existed).
const DefaultBodyTemplate = `{"event":"{{.event}}","project_id":{{.project_id}},"timestamp":"{{.timestamp}}","data":{{.data}}}`
