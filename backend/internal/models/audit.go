package models

// AuditLog is a project-scoped trail of administrative actions: who did
// what, to which target, when. Issue-level changes use IssueActivity
// instead; this is for project-shape changes.
type AuditLog struct {
	Base
	ProjectID  uint   `gorm:"index;not null" json:"project_id"`
	ActorID    uint   `gorm:"index;not null" json:"actor_id"`
	Actor      *User  `gorm:"foreignKey:ActorID" json:"actor,omitempty"`
	Action     string `gorm:"not null;size:64" json:"action"`
	TargetType string `gorm:"size:32" json:"target_type"`
	TargetID   uint   `json:"target_id"`
	Details    string `gorm:"type:text" json:"details"`
}
