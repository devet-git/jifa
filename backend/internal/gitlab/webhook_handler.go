package gitlab

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"jifa/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// WebhookHandler processes inbound GitLab webhooks: upserts external refs
// and optionally transitions issue status. The status hook is injected
// from the api/handlers package to reuse Jifa's normal update path
// without an import cycle.
type WebhookHandler struct {
	db                  *gorm.DB
	onIssueStatusChange func(issue *models.Issue, newStatus, reason string) error
}

func NewWebhookHandler(db *gorm.DB) *WebhookHandler {
	return &WebhookHandler{db: db}
}

func (h *WebhookHandler) SetTransitionHook(fn func(issue *models.Issue, newStatus, reason string) error) {
	h.onIssueStatusChange = fn
}

// Receive is unauthenticated by JWT; the X-Gitlab-Token shared secret
// is the only credential.
func (h *WebhookHandler) Receive(c *gin.Context) {
	projectID, err := strconv.ParseUint(c.Param("projectId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}

	var integ models.GitLabIntegration
	if err := h.db.Where("project_id = ? AND enabled = ?", projectID, true).First(&integ).Error; err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	got := []byte(c.GetHeader("X-Gitlab-Token"))
	want := []byte(integ.WebhookSecret)
	if len(got) == 0 || subtle.ConstantTimeCompare(got, want) != 1 {
		c.Status(http.StatusUnauthorized)
		return
	}

	eventName := c.GetHeader("X-Gitlab-Event")
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not read body"})
		return
	}

	var project models.Project
	if err := h.db.First(&project, integ.ProjectID).Error; err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	switch eventName {
	case "Push Hook":
		h.handlePush(body, &integ, &project)
	case "Merge Request Hook":
		h.handleMR(body, &integ, &project)
	}

	now := time.Now()
	h.db.Model(&integ).Update("last_ping_at", &now)

	c.JSON(http.StatusAccepted, gin.H{"ok": true})
}

type pushPayload struct {
	Ref        string `json:"ref"`
	UserName   string `json:"user_name"`
	Project    struct {
		WebURL string `json:"web_url"`
	} `json:"project"`
	Commits []struct {
		ID        string    `json:"id"`
		Message   string    `json:"message"`
		Title     string    `json:"title"`
		URL       string    `json:"url"`
		Author    struct {
			Name string `json:"name"`
		} `json:"author"`
		Timestamp time.Time `json:"timestamp"`
	} `json:"commits"`
}

func (h *WebhookHandler) handlePush(body []byte, integ *models.GitLabIntegration, proj *models.Project) {
	var p pushPayload
	if err := json.Unmarshal(body, &p); err != nil {
		log.Printf("[gitlab] push: bad json: %v", err)
		return
	}
	for _, commit := range p.Commits {
		refs := ExtractCloseRefs(commit.Message, proj.Key)
		for _, r := range refs {
			issue := h.findIssueByKey(r.Key, proj.ID)
			if issue == nil {
				continue
			}
			title := commit.Title
			if title == "" {
				title = firstLine(commit.Message)
			}
			h.upsertRef(&models.IssueExternalRef{
				IssueID:      issue.ID,
				Source:       models.RefSourceGitLab,
				RefType:      models.RefTypeCommit,
				ExternalID:   commit.ID,
				Title:        truncate(title, 500),
				URL:          commit.URL,
				State:        "",
				AuthorName:   commit.Author.Name,
				CreatedAtSrc: timePtr(commit.Timestamp),
			})
		}
	}
}

type mrPayload struct {
	User       struct {
		Name string `json:"name"`
	} `json:"user"`
	ObjectAttributes struct {
		IID          int       `json:"iid"`
		Title        string    `json:"title"`
		Description  string    `json:"description"`
		State        string    `json:"state"` // opened | closed | merged | locked
		Action       string    `json:"action"` // open | close | reopen | update | merge
		URL          string    `json:"url"`
		SourceBranch string    `json:"source_branch"`
		TargetBranch string    `json:"target_branch"`
		CreatedAt    string    `json:"created_at"`
	} `json:"object_attributes"`
}

func (h *WebhookHandler) handleMR(body []byte, integ *models.GitLabIntegration, proj *models.Project) {
	var p mrPayload
	if err := json.Unmarshal(body, &p); err != nil {
		log.Printf("[gitlab] mr: bad json: %v", err)
		return
	}
	oa := p.ObjectAttributes
	source := oa.Title + "\n" + oa.Description + "\n" + oa.SourceBranch
	refs := ExtractCloseRefs(source, proj.Key)
	if len(refs) == 0 {
		return
	}

	state := oa.State
	if state == "" {
		state = models.RefStateOpened
	}

	for _, r := range refs {
		issue := h.findIssueByKey(r.Key, proj.ID)
		if issue == nil {
			continue
		}
		h.upsertRef(&models.IssueExternalRef{
			IssueID:    issue.ID,
			Source:     models.RefSourceGitLab,
			RefType:    models.RefTypeMR,
			ExternalID: strconv.Itoa(oa.IID),
			Title:      truncate(oa.Title, 500),
			URL:        oa.URL,
			State:      state,
			AuthorName: p.User.Name,
		})

		newKey := ""
		switch oa.Action {
		case "open", "reopen":
			newKey = integ.OnMROpenedStatusKey
		case "merge":
			newKey = integ.OnMRMergedStatusKey
		case "close":
			newKey = integ.OnMRClosedStatusKey
		}
		if newKey != "" && h.onIssueStatusChange != nil {
			reason := "GitLab MR !" + strconv.Itoa(oa.IID)
			if p.User.Name != "" {
				reason += " by " + p.User.Name
			}
			if err := h.onIssueStatusChange(issue, newKey, reason); err != nil {
				log.Printf("[gitlab] transition issue %d -> %s failed: %v", issue.ID, newKey, err)
			}
		}
	}
}

// findIssueByKey returns nil if the key resolves to a different project
// (anti-cross-project safeguard), logging the drop.
func (h *WebhookHandler) findIssueByKey(key string, expectedProjectID uint) *models.Issue {
	dash := -1
	for i := len(key) - 1; i >= 0; i-- {
		if key[i] == '-' {
			dash = i
			break
		}
	}
	if dash <= 0 || dash >= len(key)-1 {
		return nil
	}
	num, err := strconv.ParseUint(key[dash+1:], 10, 64)
	if err != nil {
		return nil
	}
	var issue models.Issue
	if err := h.db.Where("project_id = ? AND number = ?", expectedProjectID, num).
		First(&issue).Error; err != nil {
		var other models.Issue
		if h.db.Where("number = ? AND project_id != ?", num, expectedProjectID).
			First(&other).Error == nil {
			log.Printf("[gitlab] cross-project ref dropped: key=%s belongs to project %d, webhook from project %d", key, other.ProjectID, expectedProjectID)
		}
		return nil
	}
	return &issue
}

func (h *WebhookHandler) upsertRef(ref *models.IssueExternalRef) {
	var existing models.IssueExternalRef
	err := h.db.Where("issue_id = ? AND source = ? AND ref_type = ? AND external_id = ?",
		ref.IssueID, ref.Source, ref.RefType, ref.ExternalID).
		First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if err := h.db.Create(ref).Error; err != nil {
			log.Printf("[gitlab] insert ref failed: %v", err)
		}
		return
	}
	if err != nil {
		log.Printf("[gitlab] upsert lookup failed: %v", err)
		return
	}
	updates := map[string]any{
		"title":       ref.Title,
		"url":         ref.URL,
		"state":       ref.State,
		"author_name": ref.AuthorName,
	}
	if ref.CreatedAtSrc != nil {
		updates["created_at_src"] = ref.CreatedAtSrc
	}
	if err := h.db.Model(&existing).Updates(updates).Error; err != nil {
		log.Printf("[gitlab] update ref failed: %v", err)
	}
}

func firstLine(s string) string {
	for i, r := range s {
		if r == '\n' {
			return s[:i]
		}
	}
	return s
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func timePtr(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}
