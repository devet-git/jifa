package config

import (
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	Env         string
	UploadDir   string
	AppURL      string // base URL for links in emails

	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	SMTPFrom string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://jifa:jifa_secret@localhost:5432/jifa_db?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		Env:         getEnv("APP_ENV", "development"),
		UploadDir:   getEnv("UPLOAD_DIR", "uploads"),
		AppURL:      getEnv("APP_URL", "http://localhost:3000"),

		SMTPHost: getEnv("SMTP_HOST", ""),
		SMTPPort: getEnv("SMTP_PORT", "587"),
		SMTPUser: getEnv("SMTP_USER", ""),
		SMTPPass: getEnv("SMTP_PASS", ""),
		SMTPFrom: getEnv("SMTP_FROM", "jifa@localhost"),
	}
}

// EmailEnabled reports whether SMTP is configured. When false, the mailer is
// a no-op (still logs at debug).
func (c *Config) EmailEnabled() bool {
	return c.SMTPHost != ""
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
