package models

type WikiPage struct {
	Base
	ProjectID uint   `gorm:"not null;index" json:"project_id"`
	Title     string `gorm:"not null" json:"title"`
	Content   string `gorm:"type:text" json:"content"`
	AuthorID  uint   `gorm:"not null" json:"author_id"`
	Author    *User  `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}
