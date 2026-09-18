package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

// RoleGuard creates middleware that requires the user to have one of the specified roles.
// It reads the JWT from the Authorization header and checks the "roles" claim.
func RoleGuard(jwtSecret string, allowedRoles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing authorization"})
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token"})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid claims"})
		}

		// Extract roles from JWT
		rolesRaw, ok := claims["roles"].([]interface{})
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No roles in token"})
		}

		userRoles := make(map[string]bool)
		for _, r := range rolesRaw {
			if role, ok := r.(string); ok {
				userRoles[role] = true
			}
		}

		// Superadmin and admin have elevated authority for ghost preview and school inspection
		if userRoles["superadmin"] || userRoles["admin"] {
			c.Locals("user_id", claims["sub"])
			c.Locals("user_roles", userRoles)
			return c.Next()
		}

		// Check if any allowed role matches
		for _, allowed := range allowedRoles {
			if userRoles[allowed] {
				// Store user info in context for downstream handlers
				c.Locals("user_id", claims["sub"])
				c.Locals("user_roles", userRoles)
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Insufficient permissions"})
	}
}

// ExtractUserID gets the user ID from context (set by RoleGuard or Protected middleware)
func ExtractUserID(c fiber.Ctx) string {
	if id, ok := c.Locals("user_id").(string); ok {
		return id
	}
	return ""
}
