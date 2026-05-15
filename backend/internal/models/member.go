package models

// ProjectRole is a legacy string enum kept for backward compatibility
// with existing database rows. New code should use RoleID → roles table.
type ProjectRole string

// Member represents a user's membership of a project with a specific role.
type Member struct {
	Base
	ProjectID uint        `gorm:"uniqueIndex:idx_member_project_user;not null" json:"project_id"`
	UserID    uint        `gorm:"uniqueIndex:idx_member_project_user;not null" json:"user_id"`
	Role      ProjectRole `gorm:"not null;default:'member'" json:"role"`
	RoleID    uint        `gorm:"not null;default:2" json:"role_id"`
	User      User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	RoleModel *Role       `gorm:"foreignKey:RoleID" json:"role_model,omitempty"`
}
