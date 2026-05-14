package models

type IssueLinkType string

const (
	LinkBlocks     IssueLinkType = "blocks"
	LinkRelates    IssueLinkType = "relates"
	LinkDuplicates IssueLinkType = "duplicates"
)

// IssueLink records a typed relationship between two issues. The "inverse"
// view (blocked-by, duplicated-by) is computed by querying with target_id.
type IssueLink struct {
	Base
	Type     IssueLinkType `gorm:"not null;uniqueIndex:idx_link_unique" json:"type"`
	SourceID uint          `gorm:"not null;uniqueIndex:idx_link_unique" json:"source_id"`
	TargetID uint          `gorm:"not null;uniqueIndex:idx_link_unique" json:"target_id"`
	Source   *Issue        `gorm:"foreignKey:SourceID" json:"source,omitempty"`
	Target   *Issue        `gorm:"foreignKey:TargetID" json:"target,omitempty"`
}

func ValidLinkType(t IssueLinkType) bool {
	switch t {
	case LinkBlocks, LinkRelates, LinkDuplicates:
		return true
	}
	return false
}
