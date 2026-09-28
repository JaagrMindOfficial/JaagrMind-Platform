package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"
)

// GetClientIP retrieves the real client IP accounting for reverse proxies (Cloudflare, Dokploy, Nginx)
func GetClientIP(c fiber.Ctx) string {
	if cfIP := c.Get("CF-Connecting-IP"); cfIP != "" {
		return strings.TrimSpace(cfIP)
	}
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
			return strings.TrimSpace(parts[0])
		}
	}
	if xRealIP := c.Get("X-Real-IP"); xRealIP != "" {
		return strings.TrimSpace(xRealIP)
	}
	return c.IP()
}

// NewRateLimiter creates a rate limiter with custom limits, window duration, and friendly JSON response
func NewRateLimiter(max int, expiration time.Duration, message string) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: expiration,
		KeyGenerator: func(c fiber.Ctx) string {
			return GetClientIP(c)
		},
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   message,
				"success": false,
			})
		},
	})
}

// InstitutionApplicationRateLimiter limits public school / institute application submissions (3 per 15 min)
func InstitutionApplicationRateLimiter() fiber.Handler {
	return NewRateLimiter(
		3,
		15*time.Minute,
		"Too many institution applications submitted from this network. Please wait a few minutes before trying again.",
	)
}

// AuthSignupRateLimiter limits public consumer and parent registrations (5 per 15 min)
func AuthSignupRateLimiter() fiber.Handler {
	return NewRateLimiter(
		5,
		15*time.Minute,
		"Too many registration attempts. Please wait a few minutes before trying again.",
	)
}

// AuthLoginRateLimiter protects login endpoints against brute-force (10 per 5 min)
func AuthLoginRateLimiter() fiber.Handler {
	return NewRateLimiter(
		10,
		5*time.Minute,
		"Too many login attempts. Please wait 5 minutes before trying again.",
	)
}

// ForgotPasswordRateLimiter limits OTP and password reset requests (5 per 10 min)
func ForgotPasswordRateLimiter() fiber.Handler {
	return NewRateLimiter(
		5,
		10*time.Minute,
		"Too many verification requests. Please wait a few minutes before trying again.",
	)
}

// AssessmentSubmissionRateLimiter limits assessment submissions from any single IP (10 per 5 min)
func AssessmentSubmissionRateLimiter() fiber.Handler {
	return NewRateLimiter(
		10,
		5*time.Minute,
		"Too many assessment submissions received from this network. Please wait a moment.",
	)
}
