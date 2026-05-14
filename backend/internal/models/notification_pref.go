package models

import "time"

// NotificationPref captures per-user delivery preferences. One row per user
// (auto-created on first access if missing). Each notification type has two
// channels: in-app (the bell + notifications page) and email. Default is
// everything on except status_change email — the noisiest channel.
type NotificationPref struct {
	Base
	UserID uint `gorm:"uniqueIndex;not null" json:"user_id"`

	InAppComment      bool `gorm:"not null;default:true" json:"in_app_comment"`
	InAppMention      bool `gorm:"not null;default:true" json:"in_app_mention"`
	InAppAssigned     bool `gorm:"not null;default:true" json:"in_app_assigned"`
	InAppStatusChange bool `gorm:"not null;default:true" json:"in_app_status_change"`
	InAppLinkAdded    bool `gorm:"not null;default:true" json:"in_app_link_added"`

	EmailComment      bool `gorm:"not null;default:true" json:"email_comment"`
	EmailMention      bool `gorm:"not null;default:true" json:"email_mention"`
	EmailAssigned     bool `gorm:"not null;default:true" json:"email_assigned"`
	EmailStatusChange bool `gorm:"not null;default:false" json:"email_status_change"`
	EmailLinkAdded    bool `gorm:"not null;default:true" json:"email_link_added"`

	// Digest mode: suppress per-event emails and send one daily summary instead.
	EmailDigest  bool       `gorm:"not null;default:false" json:"email_digest"`
	DigestSentAt *time.Time `json:"digest_sent_at"`
}

// AllowsInApp reports whether the user should receive an in-app notification
// for this type. Mirrors AllowsEmail.
func (p NotificationPref) AllowsInApp(t NotificationType) bool {
	switch t {
	case NotifComment:
		return p.InAppComment
	case NotifMention:
		return p.InAppMention
	case NotifAssigned:
		return p.InAppAssigned
	case NotifStatusChange:
		return p.InAppStatusChange
	case NotifLinkAdded:
		return p.InAppLinkAdded
	}
	return true
}

func (p NotificationPref) AllowsEmail(t NotificationType) bool {
	if p.EmailDigest {
		return false // digest mode suppresses all per-event emails
	}
	switch t {
	case NotifComment:
		return p.EmailComment
	case NotifMention:
		return p.EmailMention
	case NotifAssigned:
		return p.EmailAssigned
	case NotifStatusChange:
		return p.EmailStatusChange
	case NotifLinkAdded:
		return p.EmailLinkAdded
	}
	return true
}

// DefaultNotificationPref returns the seed used the first time we look up a
// user with no row yet. Matches the gorm column defaults.
func DefaultNotificationPref(userID uint) NotificationPref {
	return NotificationPref{
		UserID:            userID,
		InAppComment:      true,
		InAppMention:      true,
		InAppAssigned:     true,
		InAppStatusChange: true,
		InAppLinkAdded:    true,
		EmailComment:      true,
		EmailMention:      true,
		EmailAssigned:     true,
		EmailStatusChange: false,
		EmailLinkAdded:    true,
		EmailDigest:       false,
	}
}
