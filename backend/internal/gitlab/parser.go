// Package gitlab implements the GitLab integration: outbound REST client,
// AES-GCM crypto for the access token, smart-commit parsing, and the
// inbound webhook handler.
package gitlab

import (
	"regexp"
	"strings"
)

// closeKeywords mirror GitHub/GitLab/Jira's auto-close verbs.
var closeKeywords = map[string]bool{
	"close":     true,
	"closes":    true,
	"closed":    true,
	"closing":   true,
	"fix":       true,
	"fixes":     true,
	"fixed":     true,
	"fixing":    true,
	"resolve":   true,
	"resolves":  true,
	"resolved":  true,
	"resolving": true,
}

type CloseAction string

const (
	ActionClose CloseAction = "close"
	ActionRef   CloseAction = "ref"
)

type CloseRef struct {
	Key    string
	Action CloseAction
}

// Prefix allows letters, digits, and underscore to mirror Project.Key's
// alphanumeric+underscore constraint.
var keyPattern = regexp.MustCompile(`(?i)\b([A-Z][A-Z0-9_]*)-(\d+)\b`)

var closePattern = regexp.MustCompile(`(?i)\b([a-z]+)\s+([A-Z][A-Z0-9_]*-\d+)\b`)

// ExtractIssueKeys returns issue keys (deduped, upper-cased) in text that
// belong to projectKey. Keys from other projects are dropped.
func ExtractIssueKeys(text, projectKey string) []string {
	if text == "" || projectKey == "" {
		return nil
	}
	want := strings.ToUpper(projectKey)
	seen := map[string]bool{}
	var out []string
	for _, m := range keyPattern.FindAllStringSubmatch(text, -1) {
		prefix := strings.ToUpper(m[1])
		num := m[2]
		if prefix != want {
			continue
		}
		key := prefix + "-" + num
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, key)
	}
	return out
}

// ExtractCloseRefs returns issue refs with their action: ActionClose
// when preceded by a close-keyword (Fixes/Closes/Resolves...), else
// ActionRef. ActionClose wins if the same key appears with both.
func ExtractCloseRefs(text, projectKey string) []CloseRef {
	if text == "" || projectKey == "" {
		return nil
	}
	want := strings.ToUpper(projectKey)

	closing := map[string]bool{}
	for _, m := range closePattern.FindAllStringSubmatch(text, -1) {
		kw := strings.ToLower(m[1])
		if !closeKeywords[kw] {
			continue
		}
		key := strings.ToUpper(m[2])
		if !strings.HasPrefix(key, want+"-") {
			continue
		}
		closing[key] = true
	}

	seen := map[string]bool{}
	var out []CloseRef
	for _, m := range keyPattern.FindAllStringSubmatch(text, -1) {
		prefix := strings.ToUpper(m[1])
		num := m[2]
		if prefix != want {
			continue
		}
		key := prefix + "-" + num
		if seen[key] {
			continue
		}
		seen[key] = true
		action := ActionRef
		if closing[key] {
			action = ActionClose
		}
		out = append(out, CloseRef{Key: key, Action: action})
	}
	return out
}
