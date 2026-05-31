
// =================================================================
// ARCHIVO 7: /internal/middleware/auth_middleware.go (NUEVO ARCHIVO)
// Propósito: Middleware para proteger rutas.
// =================================================================
package middleware

import (
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

func Protected(sessionRepo repository.SessionRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		parts := strings.Split(authHeader, " ")

		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing or malformed JWT"})
		}

		token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Unexpected signing method")
			}
			return service.JWT_SECRET_KEY, nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired JWT"})
		}

		claims := token.Claims.(jwt.MapClaims)

		userIDRaw, ok := claims["sub"].(string)
		if !ok || userIDRaw == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
		}
		sessionIDRaw, ok := claims["sid"].(string)
		if !ok || sessionIDRaw == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
		}

		userID, err := uuid.Parse(userIDRaw)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
		}
		sessionID, err := uuid.Parse(sessionIDRaw)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
		}

		active, err := sessionRepo.IsSessionActive(sessionID, userID, time.Now().UTC())
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Session validation failed"})
		}
		if !active {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Session revoked or expired"})
		}

		c.Locals("user_id", userID)
		c.Locals("user_role", claims["role"])

		return c.Next()
	}
}
