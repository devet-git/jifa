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
	sb.WriteString(fmt.Sprintf(`
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#1f2937;">
  You have <strong style="color:#4f46e5;">%d unread notification(s)</strong> since your last digest:
</p>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:0;">`, len(items)))

	for i, n := range items {
		actor := "Someone"
		if n.Actor != nil {
			actor = html.EscapeString(n.Actor.Name)
		}
		var issueKey string
		if n.Issue != nil {
			issueKey = fmt.Sprintf("%s-%d", n.Issue.Project.Key, n.Issue.Number)
			issueKey = html.EscapeString(issueKey)
		}
		verb := map[models.NotificationType]string{
			models.NotifComment:      "commented",
			models.NotifMention:      "mentioned you",
			models.NotifAssigned:     "assigned you",
			models.NotifStatusChange: "changed status on",
			models.NotifLinkAdded:    "linked an issue",
		}[n.Type]

		bg := "#ffffff"
		if i%2 == 1 {
			bg = "#f9fafb"
		}
		bodyText := html.EscapeString(n.Body)
		if len(bodyText) > 120 {
			bodyText = bodyText[:120] + "…"
		}

		sb.WriteString(fmt.Sprintf(`
<tr>
  <td style="padding:14px 16px;background-color:%s;border-bottom:1px solid #f3f4f6;">
    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:14px;line-height:1.5;color:#1f2937;">
          <strong>%s</strong> %s%s
        </td>
      </tr>
      <tr>
        <td style="font-size:13px;line-height:1.4;color:#6b7280;padding-top:4px;">
          %s
        </td>
      </tr>
    </table>
  </td>
</tr>`, bg, actor, verb, " "+issueKey, bodyText))
	}

	sb.WriteString(fmt.Sprintf(`
</table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
  <a href="%s" style="color:#4f46e5;text-decoration:underline;">View all notifications</a>
</p>`, mailer.NotificationsURL()))

	return mailer.RenderBody(
		fmt.Sprintf("%d unread notifications", len(items)),
		sb.String(),
	)
}
