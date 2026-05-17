package handlers

import (
	"errors"
	"log"

	"jifa/backend/internal/gitlab"
	"jifa/backend/internal/models"
	"jifa/backend/internal/webhook"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GitLabWebhookHandler routes inbound GitLab webhooks through Jifa's
// normal status-update path so activity, notifications, and outbound
// webhooks all fire as if a user changed the status manually.
type GitLabWebhookHandler struct {
	inner *gitlab.WebhookHandler
	db    *gorm.DB
}

func NewGitLabWebhookHandler(db *gorm.DB) *GitLabWebhookHandler {
	wh := gitlab.NewWebhookHandler(db)
	h := &GitLabWebhookHandler{inner: wh, db: db}
	wh.SetTransitionHook(h.transitionIssueStatus)
	return h
}

func (h *GitLabWebhookHandler) Receive(c *gin.Context) {
	h.inner.Receive(c)
}

func (h *GitLabWebhookHandler) transitionIssueStatus(issue *models.Issue, newStatusKey, reason string) error {
	if string(issue.Status) == newStatusKey {
		return nil
	}
	var status models.StatusDefinition
	if err := h.db.Where("project_id = ? AND key = ?", issue.ProjectID, newStatusKey).
		First(&status).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[gitlab] status %q not found in project %d", newStatusKey, issue.ProjectID)
		}
		return err
	}

	old := *issue
	if err := h.db.Model(issue).Update("status", newStatusKey).Error; err != nil {
		return err
	}
	h.db.Preload("Project").First(issue, issue.ID)

	// System rows use UserID=nil (FK to users(id)). Frontend renders as "GitLab".
	if err := h.db.Create(&models.IssueActivity{
		IssueID:  issue.ID,
		UserID:   nil,
		Field:    "status",
		OldValue: string(old.Status),
		NewValue: newStatusKey,
	}).Error; err != nil {
		log.Printf("[gitlab] insert status activity for issue %d failed: %v", issue.ID, err)
	}
	if err := h.db.Create(&models.IssueActivity{
		IssueID:  issue.ID,
		UserID:   nil,
		Field:    "gitlab_source",
		OldValue: "",
		NewValue: reason,
	}).Error; err != nil {
		log.Printf("[gitlab] insert gitlab_source activity for issue %d failed: %v", issue.ID, err)
	}

	dispatchToWatchers(h.db, issue.ID, 0, func(uid uint) *models.Notification {
		return &models.Notification{
			UserID:  uid,
			Type:    models.NotifStatusChange,
			IssueID: &issue.ID,
			Body:    string(old.Status) + " → " + newStatusKey + " (" + reason + ")",
		}
	})

	webhook.Dispatch(h.db, issue.ProjectID, models.EventIssueStatusChanged, gin.H{
		"issue":      issue,
		"old_status": old.Status,
		"new_status": newStatusKey,
		"source":     reason,
	})
	return nil
}
