package models

import "time"

type SprintStatus string

const (
	SprintPlanned  SprintStatus = "planned"
	SprintActive   SprintStatus = "active"
	SprintComplete SprintStatus = "completed"
)

// SprintCommitment is the snapshot of a sprint's committed scope at the moment
// it transitions to "active". It is the source of truth for retrospective
// metrics — once written, it must not change even if issues are added,
// removed, or re-estimated mid-sprint.
type SprintCommitment struct {
	IssueIDs       []uint       `json:"issue_ids"`
	PointsByIssue  map[uint]int `json:"points_by_issue"`
	TotalIssues    int          `json:"total_issues"`
	TotalPoints    int          `json:"total_points"`
	SnapshotTakenAt time.Time   `json:"snapshot_taken_at"`
}

type Sprint struct {
	Base
	Name        string       `gorm:"not null" json:"name"`
	Goal        string       `json:"goal"`
	Status      SprintStatus `gorm:"default:'planned'" json:"status"`
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	CompletedAt *time.Time   `json:"completed_at"`

	// CommitmentSnapshot is nil for sprints that have never been started.
	CommitmentSnapshot *SprintCommitment `gorm:"type:jsonb;serializer:json" json:"commitment_snapshot,omitempty"`

	ProjectID uint    `json:"project_id"`
	Issues    []Issue `gorm:"foreignKey:SprintID" json:"issues,omitempty"`
}
