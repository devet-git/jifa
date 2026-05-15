package handlers

import (
	"fmt"
	"html"
	"net/http"
	"strconv"
	"time"

	"jifa/backend/internal/mailer"
	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NotificationHandler struct{ db *gorm.DB }

func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

func (h *NotificationHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	q := h.db.Where("user_id = ?", userID).
		Preload("Actor").Preload("Issue.Project").
		Order("created_at DESC").
		Limit(limit)
	if c.Query("unread") == "1" {
		q = q.Where("read_at IS NULL")
	}
	var entries []models.Notification
	q.Find(&entries)
	// Surface project key on the issue payload for the bell list.
	for i := range entries {
		if entries[i].Issue != nil {
			tmp := *entries[i].Issue
			setIssueKey(&tmp)
			entries[i].Issue = &tmp
		}
	}
	c.JSON(http.StatusOK, entries)
}

func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID, _ := c.Get("userID")
	var count int64
	h.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Count(&count)
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userID, _ := c.Get("userID")
	now := time.Now()
	h.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", c.Param("id"), userID).
		Update("read_at", now)
	c.Status(http.StatusNoContent)
}

func (h *NotificationHandler) GetPrefs(c *gin.Context) {
	userID, _ := c.Get("userID")
	prefs := loadPrefs(h.db, userID.(uint))
	c.JSON(http.StatusOK, prefs)
}

type prefsDTO struct {
	InAppComment      *bool `json:"in_app_comment"`
	InAppMention      *bool `json:"in_app_mention"`
	InAppAssigned     *bool `json:"in_app_assigned"`
	InAppStatusChange *bool `json:"in_app_status_change"`
	InAppLinkAdded    *bool `json:"in_app_link_added"`

	EmailComment      *bool `json:"email_comment"`
	EmailMention      *bool `json:"email_mention"`
	EmailAssigned     *bool `json:"email_assigned"`
	EmailStatusChange *bool `json:"email_status_change"`
	EmailLinkAdded    *bool `json:"email_link_added"`
	EmailDigest       *bool `json:"email_digest"`
}

func (h *NotificationHandler) UpdatePrefs(c *gin.Context) {
	userID, _ := c.Get("userID")
	pref := loadPrefs(h.db, userID.(uint))
	var dto prefsDTO
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	apply := func(dst *bool, src *bool) {
		if src != nil {
			*dst = *src
		}
	}
	apply(&pref.InAppComment, dto.InAppComment)
	apply(&pref.InAppMention, dto.InAppMention)
	apply(&pref.InAppAssigned, dto.InAppAssigned)
	apply(&pref.InAppStatusChange, dto.InAppStatusChange)
	apply(&pref.InAppLinkAdded, dto.InAppLinkAdded)
	apply(&pref.EmailComment, dto.EmailComment)
	apply(&pref.EmailMention, dto.EmailMention)
	apply(&pref.EmailAssigned, dto.EmailAssigned)
	apply(&pref.EmailStatusChange, dto.EmailStatusChange)
	apply(&pref.EmailLinkAdded, dto.EmailLinkAdded)
	apply(&pref.EmailDigest, dto.EmailDigest)
	h.db.Save(&pref)
	c.JSON(http.StatusOK, pref)
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID, _ := c.Get("userID")
	now := time.Now()
	h.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Update("read_at", now)
	c.Status(http.StatusNoContent)
}

// dispatch is the single point all event-generating code calls to create
// notifications. It de-duplicates the actor (no self-notify), respects the
// recipient's per-channel preferences, persists the in-app row when allowed,
// and fires an email when both SMTP and the user's email pref allow it.
func dispatch(db *gorm.DB, n *models.Notification, actorID uint) {
	if n.UserID == 0 || n.UserID == actorID {
		return
	}
	a := actorID
	n.ActorID = &a

	prefs := loadPrefs(db, n.UserID)
	if prefs.AllowsInApp(n.Type) {
		if err := db.Create(n).Error; err != nil {
			return
		}
	}
	if prefs.AllowsEmail(n.Type) {
		go sendEmail(db, n, actorID)
	}
}

// loadPrefs returns the user's notification prefs, creating a default row
// the first time we need one.
func loadPrefs(db *gorm.DB, userID uint) models.NotificationPref {
	var pref models.NotificationPref
	if err := db.Where("user_id = ?", userID).First(&pref).Error; err == nil {
		return pref
	}
	pref = models.DefaultNotificationPref(userID)
	_ = db.Create(&pref).Error
	return pref
}

// sendEmail looks up the recipient and actor and ships an email through the
// mailer. Runs in its own goroutine so the request path never blocks.
func sendEmail(db *gorm.DB, n *models.Notification, actorID uint) {
	defer func() { _ = recover() }() // never crash on a bad notification

	var recipient models.User
	if err := db.Select("id, name, email").First(&recipient, n.UserID).Error; err != nil {
		return
	}
	if recipient.Email == "" {
		return
	}
	var actorName string
	if actorID != 0 {
		var a models.User
		if err := db.Select("name").First(&a, actorID).Error; err == nil {
			actorName = a.Name
		}
	}

	var issueKey, issueTitle, link string
	if n.IssueID != nil {
		var issue models.Issue
		if err := db.Preload("Project").First(&issue, *n.IssueID).Error; err == nil {
			issueKey = fmt.Sprintf("%s-%d", issue.Project.Key, issue.Number)
			issueTitle = issue.Title
			link = mailer.IssueURL(issue.ProjectID, issue.ID)
		}
	}

	subject := emailSubject(n.Type, issueKey, issueTitle)
	body := emailBody(n.Type, actorName, html.EscapeString(n.Body), issueKey, issueTitle, link)
	mailer.Send([]string{recipient.Email}, subject, body)
}

func emailSubject(t models.NotificationType, key, title string) string {
	verb := map[models.NotificationType]string{
		models.NotifComment:      "New comment on",
		models.NotifMention:      "Mentioned in",
		models.NotifAssigned:     "Assigned to you:",
		models.NotifStatusChange: "Status changed on",
		models.NotifLinkAdded:    "Issue linked:",
	}[t]
	if key != "" {
		return fmt.Sprintf("[Jifa] %s %s — %s", verb, key, title)
	}
	return fmt.Sprintf("[Jifa] %s notification", t)
}

func emailBody(t models.NotificationType, actor, body, key, title, link string) string {
	verb := map[models.NotificationType]string{
		models.NotifComment:      "commented on",
		models.NotifMention:      "mentioned you in",
		models.NotifAssigned:     "assigned you to",
		models.NotifStatusChange: "moved",
		models.NotifLinkAdded:    "linked",
	}[t]
	if actor == "" {
		actor = "Someone"
	}
	issueRef := html.EscapeString(key + " " + title)
	inner := fmt.Sprintf(`
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#1f2937;">
  <strong>%s</strong> %s <strong>%s</strong>.
</p>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  <tr>
    <td style="border-left:3px solid #e5e7eb;padding:12px 16px;background-color:#f9fafb;font-size:14px;line-height:1.6;color:#4b5563;">
      %s
    </td>
  </tr>
</table>
%s`, html.EscapeString(actor), verb, issueRef, body, mailer.RenderButton(link, "View issue"))
	return mailer.RenderBody("Jifa notification: "+issueRef, inner)
}

// dispatchToWatchers notifies every watcher of the issue except the actor.
// build may return nil to skip a particular watcher (e.g., they were already
// notified through a different channel).
func dispatchToWatchers(db *gorm.DB, issueID, actorID uint, build func(uint) *models.Notification) {
	var watchers []models.IssueWatcher
	db.Select("user_id").Where("issue_id = ?", issueID).Find(&watchers)
	for _, w := range watchers {
		n := build(w.UserID)
		if n == nil {
			continue
		}
		dispatch(db, n, actorID)
	}
}
