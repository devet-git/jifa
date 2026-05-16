package models

type WikiWatcher struct {
	Base
	WikiPageID uint  `gorm:"not null;uniqueIndex:idx_wiki_watcher_unique" json:"wiki_page_id"`
	UserID     uint  `gorm:"not null;uniqueIndex:idx_wiki_watcher_unique" json:"user_id"`
	User       *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
