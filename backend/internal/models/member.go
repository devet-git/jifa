package models

type ProjectRole string

const (
	RoleAdmin  ProjectRole = "admin"
	RoleMember ProjectRole = "member"
	RoleViewer ProjectRole = "viewer"
)

// Member represents a user's membership of a project with a specific role.
type Member struct {
	Base
	ProjectID uint        `gorm:"uniqueIndex:idx_member_project_user;not null" json:"project_id"`
	UserID    uint        `gorm:"uniqueIndex:idx_member_project_user;not null" json:"user_id"`
	Role      ProjectRole `gorm:"not null;default:'member'" json:"role"`
	User      User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// RoleRank returns a comparable rank where higher = more privileged.
func RoleRank(r ProjectRole) int {
	switch r {
	case RoleAdmin:
		return 3
	case RoleMember:
		return 2
	case RoleViewer:
		return 1
	}
	return 0
}
