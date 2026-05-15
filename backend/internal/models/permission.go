package models

type Permission struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Key         string `gorm:"uniqueIndex;not null" json:"key"`
	Name        string `gorm:"not null" json:"name"`
	Group       string `gorm:"not null;index" json:"group"`
	Description string `json:"description"`
}
