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
	BasePath    string // URL prefix for reverse proxy (e.g. "/jifa")

	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	SMTPFrom     string
	SMTPFromName string

	MCPEnabled bool   // enable MCP endpoint
	MCPPath    string // URL sub-path under /api/v1 (default: /mcp → full path /api/v1/mcp)
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://jifa:jifa_secret@localhost:5432/jifa_db?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		Env:         getEnv("APP_ENV", "development"),
		UploadDir:   getEnv("UPLOAD_DIR", "uploads"),
		AppURL:      getEnv("APP_URL", "http://localhost:3000"),
		BasePath:    getEnv("BASE_PATH", ""),

		SMTPHost: getEnv("SMTP_HOST", ""),
		SMTPPort: getEnv("SMTP_PORT", "587"),
		SMTPUser: getEnv("SMTP_USER", ""),
		SMTPPass: getEnv("SMTP_PASS", ""),
		SMTPFrom:     getEnv("SMTP_FROM", "jifa@localhost"),
		SMTPFromName: getEnv("SMTP_FROM_NAME", ""),

		MCPEnabled: getEnv("MCP_ENABLED", "false") == "true",
		MCPPath:    getEnv("MCP_PATH", "/mcp"),
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
