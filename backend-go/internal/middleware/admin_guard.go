package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

// AdminGuard ensures the request either isn't hitting an admin endpoint, 
// or if it is, that it's coming from a safe subnet (like NetBird).
func AdminGuard(safeSubnets []string) fiber.Handler {
	return func(c fiber.Ctx) error {
		path := c.Path()
		
		// If it's not an admin route, pass through.
		if !strings.HasPrefix(path, "/api/admin") {
			return c.Next()
		}

		clientIP := c.IP()
		
		// Note: In production, we'd use net.ParseCIDR and check if IP is in range.
		// For scaffolding simplicity, we do string prefix matches.
		isSafe := false
		for _, subnet := range safeSubnets {
			// Subnet might be "100.64." or "127.0.0.1" (localhost for dev)
			if strings.HasPrefix(clientIP, subnet) {
				isSafe = true
				break
			}
		}

		if !isSafe {
			// Return 404 instead of 403 to completely hide the existence of the admin route
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Not found",
			})
		}

		return c.Next()
	}
}
