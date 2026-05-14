package models

type Attachment struct {
	Base
	IssueID          uint   `gorm:"index;not null" json:"issue_id"`
	UploaderID       uint   `gorm:"not null" json:"uploader_id"`
	Uploader         *User  `gorm:"foreignKey:UploaderID" json:"uploader,omitempty"`
	OriginalFilename string `gorm:"not null" json:"original_filename"`
	StoredPath       string `gorm:"not null" json:"-"` // relative path inside upload root
	MimeType         string `gorm:"size:128" json:"mime_type"`
	Size             int64  `gorm:"not null" json:"size"`
}
