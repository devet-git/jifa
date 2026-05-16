// Package webhook fires outbound HTTP notifications to project-configured
// endpoints. Each webhook can fully customise the request shape: method,
// URL, query params, headers, auth, and body template (Go text/template).
//
// All delivery happens in a background goroutine so request handlers aren't
// blocked by slow webhook endpoints.
package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"text/template"
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
		for _, h := range hooks {
			if !subscribed(h.Events, event) {
				continue
			}
			_, _, _ = Deliver(h, event, projectID, payload)
		}
	}()
}

// DeliveryResult captures what the endpoint responded with — used by the
// Test endpoint to show users what happened.
type DeliveryResult struct {
	Method     string            `json:"method"`
	URL        string            `json:"url"`
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"response_headers"`
	Body       string            `json:"response_body"`
	Error      string            `json:"error,omitempty"`
	SentBody   string            `json:"sent_body"`
}

// Deliver performs a single webhook delivery synchronously and returns the
// response details. Used both by the async Dispatch loop and the Test
// endpoint.
func Deliver(h models.Webhook, event models.WebhookEvent, projectID uint, payload any) (status int, result DeliveryResult, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result.Method = strings.ToUpper(strings.TrimSpace(h.Method))
	if result.Method == "" {
		result.Method = "POST"
	}

	// Render body — either a single template or a set of form fields
	// rendered + URL-encoded.
	var body string
	var ct string
	if strings.EqualFold(h.BodyType, "form") {
		body, err = renderForm(h.FormFields, event, projectID, payload)
		ct = "application/x-www-form-urlencoded"
	} else {
		body, err = renderBody(h.BodyTemplate, event, projectID, payload)
		ct = strings.TrimSpace(h.ContentType)
		if ct == "" {
			ct = "application/json"
		}
	}
	if err != nil {
		result.Error = "template error: " + err.Error()
		return 0, result, err
	}
	result.SentBody = body

	// Build URL with query params
	endpoint, err := buildURL(h.URL, h.QueryParams)
	if err != nil {
		result.Error = "url error: " + err.Error()
		return 0, result, err
	}
	result.URL = endpoint

	req, err := http.NewRequestWithContext(ctx, result.Method, endpoint, bytes.NewReader([]byte(body)))
	if err != nil {
		result.Error = err.Error()
		return 0, result, err
	}

	req.Header.Set("Content-Type", ct)
	req.Header.Set("User-Agent", "Jifa-Webhook/1")

	// Custom headers (applied before auth so auth can override if user really wants)
	for k, v := range decodeHeaders(h.Headers) {
		req.Header.Set(k, v)
	}

	// Auth
	applyAuth(req, h.AuthType, h.AuthCredentials)

	// HMAC signature when secret present (useful for receivers to verify origin)
	if h.Secret != "" {
		req.Header.Set("X-Jifa-Signature", sign(h.Secret, []byte(body)))
	}

	resp, err := client.Do(req)
	if err != nil {
		result.Error = err.Error()
		return 0, result, err
	}
	defer resp.Body.Close()

	result.StatusCode = resp.StatusCode
	result.Headers = make(map[string]string, len(resp.Header))
	for k, v := range resp.Header {
		if len(v) > 0 {
			result.Headers[k] = v[0]
		}
	}
	// Cap response body capture so a chatty endpoint can't blow memory.
	const maxBody = 8 * 1024
	b, _ := io.ReadAll(io.LimitReader(resp.Body, maxBody))
	result.Body = string(b)
	return resp.StatusCode, result, nil
}

// renderBody executes the user's text/template against a plain map. `data`
// is passed as the raw JSON string so `{{.data}}` inlines the literal JSON
// payload (instead of Go's default map formatting).
//
// Available variables:
//
//	{{.event}}      string  — event name, e.g. "issue.created"
//	{{.project_id}} uint    — numeric project id
//	{{.timestamp}}  string  — ISO-8601 UTC timestamp
//	{{.data}}       string  — JSON-encoded payload (literal, unescaped)
//	{{.data_json}}  string  — JSON-encoded payload as a quoted JSON string
//	                          (use this inside a JSON string field)
func renderBody(tpl string, event models.WebhookEvent, projectID uint, payload any) (string, error) {
	t, err := template.New("body").Option("missingkey=zero").Parse(tpl)
	if err != nil {
		return "", err
	}
	dataJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	dataQuoted, _ := json.Marshal(string(dataJSON))
	ctx := map[string]any{
		"event":      string(event),
		"project_id": projectID,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"data":       string(dataJSON),
		"data_json":  string(dataQuoted),
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, ctx); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// renderForm renders each value in the form fields map through text/template,
// URL-encodes everything, and joins as `k1=v1&k2=v2&…`. Keys are sorted for
// deterministic output (helps when verifying signatures or diffing).
func renderForm(fieldsJSON string, event models.WebhookEvent, projectID uint, payload any) (string, error) {
	fields := decodeHeaders(fieldsJSON) // map[string]string
	if len(fields) == 0 {
		return "", nil
	}
	values := url.Values{}
	for k, tplStr := range fields {
		rendered, err := renderBody(tplStr, event, projectID, payload)
		if err != nil {
			return "", err
		}
		values.Set(k, rendered)
	}
	return values.Encode(), nil
}

func buildURL(base, queryParamsJSON string) (string, error) {
	if strings.TrimSpace(queryParamsJSON) == "" {
		return base, nil
	}
	params := decodeHeaders(queryParamsJSON) // same shape: map[string]string
	if len(params) == 0 {
		return base, nil
	}
	u, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func applyAuth(req *http.Request, t models.AuthType, creds string) {
	creds = strings.TrimSpace(creds)
	if creds == "" {
		return
	}
	switch t {
	case models.AuthBasic:
		// creds expected as "user:pass"
		if idx := strings.Index(creds, ":"); idx > 0 {
			req.SetBasicAuth(creds[:idx], creds[idx+1:])
		}
	case models.AuthBearer:
		req.Header.Set("Authorization", "Bearer "+creds)
	case models.AuthHeader:
		// creds expected as "HeaderName: value"
		if idx := strings.Index(creds, ":"); idx > 0 {
			name := strings.TrimSpace(creds[:idx])
			value := strings.TrimSpace(creds[idx+1:])
			if name != "" {
				req.Header.Set(name, value)
			}
		}
	}
}

func decodeHeaders(s string) map[string]string {
	s = strings.TrimSpace(s)
	if s == "" || s == "null" {
		return map[string]string{}
	}
	var m map[string]string
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		return map[string]string{}
	}
	return m
}

func subscribed(events string, e models.WebhookEvent) bool {
	for _, ev := range strings.Split(events, ",") {
		if strings.TrimSpace(ev) == string(e) {
			return true
		}
	}
	return false
}

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}
