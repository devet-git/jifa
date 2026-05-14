package models

// SavedFilter persists a per-user named query. The Query field is an opaque
// JSON blob — the frontend serialises its filter state into it and reads it
// back. Keeps the schema flexible while features evolve.
type SavedFilter struct {
	Base
	UserID    uint   `gorm:"index;not null" json:"user_id"`
	ProjectID *uint  `gorm:"index" json:"project_id"` // nil = global
	Name      string `gorm:"not null;size:120" json:"name"`
	Query     string `gorm:"type:text;not null" json:"query"`
}
