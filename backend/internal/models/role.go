package models

type Role struct {
	Base
	ProjectID *uint `gorm:"index" json:"project_id"`
	Name      string `gorm:"not null" json:"name"`
	IsSystem  bool   `gorm:"default:false" json:"is_system"`
}
