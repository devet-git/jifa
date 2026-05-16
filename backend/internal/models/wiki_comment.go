package models

type WikiComment struct {
	Base
	Body       string   `gorm:"not null" json:"body"`
	WikiPageID uint     `gorm:"not null;index" json:"wiki_page_id"`
	AuthorID   uint     `gorm:"not null" json:"author_id"`
	Author     User     `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}
