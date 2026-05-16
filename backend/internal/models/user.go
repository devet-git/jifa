package models

type UserPreferences struct {
	FontSize    string `json:"font_size"`
	FontFamily  string `json:"font_family"`
	AccentColor string `json:"accent_color"`
}

func DefaultUserPreferences() UserPreferences {
	return UserPreferences{
		FontSize:    "medium",
		FontFamily:  "geist",
		AccentColor: "indigo",
	}
}

// UserAppearance stores per-user UI appearance preferences.
// One row per user, auto-created on first access if missing.
type UserAppearance struct {
	Base
	UserID      uint            `gorm:"uniqueIndex;not null" json:"user_id"`
	Preferences UserPreferences `gorm:"type:jsonb;serializer:json" json:"preferences"`
}

type User struct {
	Base
	Name        string  `gorm:"not null" json:"name"`
	Email       string  `gorm:"uniqueIndex;not null" json:"email"`
	Password    string  `gorm:"not null" json:"-"`
	Avatar      string  `json:"avatar"`
	TotpSecret  *string `gorm:"default:null" json:"-"`
	TotpEnabled bool    `gorm:"default:false" json:"totp_enabled"`

	OwnedProjects  []Project `gorm:"foreignKey:OwnerID" json:"-"`
	AssignedIssues []Issue   `gorm:"foreignKey:AssigneeID" json:"-"`
}
