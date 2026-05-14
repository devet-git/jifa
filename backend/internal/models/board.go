package models

// Board is a saved Kanban view over a project's issues. The Filter blob is
// the same JSON shape used by SavedFilter, so the frontend can serialise its
// BacklogFilterState into it.
type Board struct {
	Base
	ProjectID uint   `gorm:"index;not null" json:"project_id"`
	Name      string `gorm:"not null;size:120" json:"name"`
	Filter    string `gorm:"type:text;not null;default:'{}'" json:"filter"`
}
