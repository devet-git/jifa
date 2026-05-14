// Package webhook fires outbound HTTP notifications to project-configured
// endpoints. All delivery happens in a background goroutine so request
// handlers aren't blocked by slow webhook endpoints.
package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"jifa/backend/internal/models"

	"gorm.io/gorm"
)

var client = &http.Client{Timeout: 10 * time.Second}

// Dispatch enqueues a webhook delivery for every active webhook on the
// project that subscribes to this event. Safe to call from request
// handlers — does no work in the caller's goroutine.
func Dispatch(db *gorm.DB, projectID uint, event models.WebhookEvent, payload any) {
	go func() {
		var hooks []models.Webhook
		err := db.Where("project_id = ? AND active = ?", projectID, true).Find(&hooks).Error
		if err != nil {
			return
		}
		body, err := json.Marshal(map[string]any{
			"event":      event,
			"project_id": projectID,
			"timestamp":  time.Now().UTC().Format(time.RFC3339),
			"data":       payload,
		})
		if err != nil {
			return
		}
		for _, h := range hooks {
			if !subscribed(h.Events, event) {
				continue
			}
			deliver(h, body)
		}
	}()
}

func subscribed(events string, e models.WebhookEvent) bool {
	for _, ev := range strings.Split(events, ",") {
		if strings.TrimSpace(ev) == string(e) {
			return true
		}
	}
	return false
}

func deliver(h models.Webhook, body []byte) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.URL, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Jifa-Webhook/1")
	req.Header.Set("X-Jifa-Signature", sign(h.Secret, body))
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
}

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}
