// Package mailer sends transactional emails over SMTP. Delivery happens in a
// background goroutine so the request path is never blocked. When SMTP isn't
// configured, Send is a no-op — useful for dev environments.
package mailer

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
	"sync"

	"jifa/backend/config"
)

type Mailer struct {
	cfg *config.Config
}

var (
	once     sync.Once
	instance *Mailer
)

// Init wires the global Mailer. Safe to call multiple times.
func Init(cfg *config.Config) {
	once.Do(func() { instance = &Mailer{cfg: cfg} })
	instance.cfg = cfg
}

// Send queues an email. The recipient list is filtered for blank addresses;
// if none remain, nothing happens. Errors are logged but not returned so
// callers can fire-and-forget.
func Send(to []string, subject, html string) {
	if instance == nil || !instance.cfg.EmailEnabled() {
		return
	}
	recipients := make([]string, 0, len(to))
	for _, addr := range to {
		addr = strings.TrimSpace(addr)
		if addr != "" {
			recipients = append(recipients, addr)
		}
	}
	if len(recipients) == 0 {
		return
	}

	go func(cfg *config.Config, rcpt []string, subj, body string) {
		addr := cfg.SMTPHost + ":" + cfg.SMTPPort
		var auth smtp.Auth
		if cfg.SMTPUser != "" {
			auth = smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPHost)
		}
		msg := buildMessage(cfg.SMTPFrom, rcpt, subj, body)
		if err := smtp.SendMail(addr, auth, cfg.SMTPFrom, rcpt, msg); err != nil {
			log.Printf("mailer: send failed: %v", err)
		}
	}(instance.cfg, recipients, subject, html)
}

func buildMessage(from string, to []string, subject, htmlBody string) []byte {
	headers := []string{
		"From: " + from,
		"To: " + strings.Join(to, ", "),
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=\"UTF-8\"",
	}
	return []byte(strings.Join(headers, "\r\n") + "\r\n\r\n" + htmlBody)
}

// IssueURL returns the canonical URL to an issue within the configured app
// host. Used to build links in email bodies.
func IssueURL(projectID, issueID uint) string {
	if instance == nil {
		return ""
	}
	return fmt.Sprintf("%s/projects/%d?issue=%d", instance.cfg.AppURL, projectID, issueID)
}
