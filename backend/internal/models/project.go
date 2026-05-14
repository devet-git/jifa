package models

type Project struct {
	Base
	Name        string `gorm:"not null" json:"name"`
	Key         string `gorm:"uniqueIndex;not null;size:10" json:"key"` // e.g. "JIFA"
	Description string `json:"description"`
	OwnerID     uint   `json:"owner_id"`
	Owner       User   `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`

	Sprints []Sprint `json:"sprints,omitempty"`
	Issues  []Issue  `json:"issues,omitempty"`
	Members []Member `json:"members,omitempty"`

	// IssueSeq is the last allocated per-project issue number. Incremented
	// transactionally on issue create.
	IssueSeq uint `gorm:"not null;default:0" json:"-"`
}
