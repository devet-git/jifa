package models

import "time"

type PersonalAccessToken struct {
	Base
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Name      string     `gorm:"not null" json:"name"`
	TokenHash string     `gorm:"not null" json:"-"`
	LastChars string     `gorm:"size:4" json:"last_chars"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}
