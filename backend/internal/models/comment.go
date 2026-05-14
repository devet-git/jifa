package models

type Comment struct {
	Base
	Body     string `gorm:"not null" json:"body"`
	IssueID  uint   `json:"issue_id"`
	AuthorID uint   `json:"author_id"`
	Author   User   `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}
