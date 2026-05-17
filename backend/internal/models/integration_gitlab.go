package models

import "time"

// GitLabIntegration is the per-project connection config (one row per
// project). The access token is encrypted at rest with AES-GCM; the
// webhook secret is plaintext (shared symmetric, compared via
// subtle.ConstantTimeCompare on inbound webhooks).
type GitLabIntegration struct {
	Base
	ProjectID uint `gorm:"uniqueIndex;not null" json:"project_id"`
	Enabled   bool `gorm:"not null;default:true" json:"enabled"`

	BaseURL  string `gorm:"type:varchar(500);not null" json:"base_url"`
	RepoPath string `gorm:"type:varchar(500);not null" json:"repo_path"`
	RepoID   int    `gorm:"not null" json:"repo_id"`

	AccessTokenCipher string `gorm:"type:text;not null" json:"-"`
	AccessTokenNonce  string `gorm:"type:varchar(64);not null" json:"-"`
	WebhookSecret     string `gorm:"type:varchar(64);not null" json:"-"`

	// Empty = "do not transition" on that MR event.
	OnMROpenedStatusKey string `gorm:"type:varchar(50);default:''" json:"on_mr_opened_status_key"`
	OnMRMergedStatusKey string `gorm:"type:varchar(50);default:''" json:"on_mr_merged_status_key"`
	OnMRClosedStatusKey string `gorm:"type:varchar(50);default:''" json:"on_mr_closed_status_key"`

	LastPingAt *time.Time `json:"last_ping_at,omitempty"`
}

const (
	RefSourceGitLab = "gitlab"
)

const (
	RefTypeBranch = "branch"
	RefTypeMR     = "mr"
	RefTypeCommit = "commit"
)

const (
	RefStateOpened = "opened"
	RefStateMerged = "merged"
	RefStateClosed = "closed"
)

// IssueExternalRef links an issue to a GitLab branch/MR/commit. The
// composite unique index prevents duplicate rows for the same target.
type IssueExternalRef struct {
	Base
	IssueID    uint   `gorm:"index;not null;uniqueIndex:idx_external_ref_unique,priority:1" json:"issue_id"`
	Source     string `gorm:"type:varchar(20);not null;index;uniqueIndex:idx_external_ref_unique,priority:2" json:"source"`
	RefType    string `gorm:"type:varchar(20);not null;uniqueIndex:idx_external_ref_unique,priority:3" json:"ref_type"`
	ExternalID string `gorm:"type:varchar(200);not null;uniqueIndex:idx_external_ref_unique,priority:4" json:"external_id"`

	Title        string     `gorm:"type:varchar(500);default:''" json:"title"`
	URL          string     `gorm:"type:text;not null" json:"url"`
	State        string     `gorm:"type:varchar(20);default:''" json:"state"`
	AuthorName   string     `gorm:"type:varchar(200);default:''" json:"author_name"`
	CreatedAtSrc *time.Time `json:"created_at_src,omitempty"`
}
