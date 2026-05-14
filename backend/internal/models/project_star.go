package models

// ProjectStar pins a project to the top of a user's project list. Composite
// uniqueness on (user_id, project_id) keeps a user from starring the same
// project twice.
type ProjectStar struct {
	Base
	UserID    uint `gorm:"uniqueIndex:idx_project_star_user_project;not null" json:"user_id"`
	ProjectID uint `gorm:"uniqueIndex:idx_project_star_user_project;not null" json:"project_id"`
}
