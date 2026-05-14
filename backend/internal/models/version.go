package models

import "time"

type VersionStatus string

const (
	VersionUnreleased VersionStatus = "unreleased"
	VersionReleased   VersionStatus = "released"
	VersionArchived   VersionStatus = "archived"
)

// Version represents a release (a.k.a. Fix Version) of a project.
type Version struct {
	Base
	ProjectID   uint          `gorm:"index;not null" json:"project_id"`
	Name        string        `gorm:"not null" json:"name"`
	Description string        `json:"description"`
	Status      VersionStatus `gorm:"not null;default:'unreleased'" json:"status"`
	ReleaseDate *time.Time    `json:"release_date"` // planned date
	ReleasedAt  *time.Time    `json:"released_at"`  // actual date
}

func ValidVersionStatus(s VersionStatus) bool {
	switch s {
	case VersionUnreleased, VersionReleased, VersionArchived:
		return true
	}
	return false
}
