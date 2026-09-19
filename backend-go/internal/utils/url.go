package utils

import (
	"os"
	"strings"
)

// GetFrontendBaseURL returns the configured frontend base URL (e.g., https://app.jaagrmind.com in production),
// falling back to http://localhost:3000 in development. Trailing slashes are stripped.
func GetFrontendBaseURL() string {
	base := os.Getenv("FRONTEND_BASE_URL")
	if base == "" {
		base = os.Getenv("APP_URL")
	}
	if base == "" {
		base = "http://localhost:3000"
	}
	return strings.TrimRight(base, "/")
}
