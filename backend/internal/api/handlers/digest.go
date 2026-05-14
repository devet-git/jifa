package handlers

import (
	"fmt"
	"html"
	"strings"
	"time"

	"jifa/backend/internal/mailer"
	"jifa/backend/internal/models"

	"gorm.io/gorm"
)

// RunDigestScheduler ticks every hour and sends digest emails to users who
// have digest mode on and haven't received one in the last 23 hours.
func RunDigestScheduler(db *gorm.DB) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for range ticker.C {
		sendPendingDigests(db)
	}
}

func sendPendingDigests(db *gorm.DB) {
	cutoff := time.Now().Add(-23 * time.Hour)
	var prefs []models.NotificationPref
	db.Where("email_digest = true AND (digest_sent_at IS NULL OR digest_sent_at < ?)", cutoff).
		Find(&prefs)
	for _, pref := range prefs {
		go sendDigestForUser(db, pref.UserID)
	}
}

func sendDigestForUser(db *gorm.DB, userID uint) {
	defer func() { _ = recover() }()

	var pref models.NotificationPref
	if err := db.Where("user_id = ?", userID).First(&pref).Error; err != nil {
		return
	}
	q := db.Where("user_id = ? AND read_at IS NULL", userID).
		Preload("Actor").Preload("Issue.Project").
		Order("created_at DESC").Limit(50)
	if pref.DigestSentAt != nil {
		q = q.Where("created_at > ?", pref.DigestSentAt)
	}
	var unread []models.Notification
	q.Find(&unread)
	if len(unread) == 0 {
		return
	}

	var recipient models.User
	if err := db.Select("id, name, email").First(&recipient, userID).Error; err != nil || recipient.Email == "" {
		return
	}

	subject := fmt.Sprintf("[Jifa] You have %d unread notification(s)", len(unread))
	body := buildDigestBody(unread)
	mailer.Send([]string{recipient.Email}, subject, body)

	now := time.Now()
	db.Model(&pref).Update("digest_sent_at", now)
}

func buildDigestBody(items []models.Notification) string {
	var sb strings.Builder
	sb.WriteString(`<div style="font-family:system-ui,sans-serif;font-size:14px;color:#111">`)
	sb.WriteString(fmt.Sprintf("<p><b>%d new notification(s) since your last digest:</b></p><ul>", len(items)))
	for _, n := range items {
		actor := "Someone"
		if n.Actor != nil {
			actor = html.EscapeString(n.Actor.Name)
		}
		var issueRef string
		if n.Issue != nil {
			key := fmt.Sprintf("%s-%d", n.Issue.Project.Key, n.Issue.Number)
			issueRef = " on " + html.EscapeString(key)
		}
		verb := map[models.NotificationType]string{
			models.NotifComment:      "commented",
			models.NotifMention:      "mentioned you",
			models.NotifAssigned:     "assigned you",
			models.NotifStatusChange: "changed status",
			models.NotifLinkAdded:    "linked an issue",
		}[n.Type]
		sb.WriteString(fmt.Sprintf("<li><b>%s</b> %s%s</li>", actor, verb, issueRef))
	}
	sb.WriteString("</ul></div>")
	return sb.String()
}
