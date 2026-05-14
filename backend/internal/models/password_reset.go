package models

import "time"

type PasswordResetToken struct {
	Base
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Token     string     `gorm:"uniqueIndex;not null;size:64" json:"token"`
	ExpiresAt time.Time  `gorm:"not null" json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	User      User       `gorm:"foreignKey:UserID" json:"-"`
}
