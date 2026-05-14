package models

type User struct {
	Base
	Name     string `gorm:"not null" json:"name"`
	Email    string `gorm:"uniqueIndex;not null" json:"email"`
	Password string `gorm:"not null" json:"-"`
	Avatar   string `json:"avatar"`

	OwnedProjects []Project `gorm:"foreignKey:OwnerID" json:"-"`
	AssignedIssues []Issue  `gorm:"foreignKey:AssigneeID" json:"-"`
}
