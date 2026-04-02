package middleware

import (
	"strings"
	"time"

	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/gofiber/fiber/v2"
)

// BackendErrorNotifier broadcasts 5xx responses to admin websocket clients.
func BackendErrorNotifier(wsHub *wshub.Hub) fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := c.Next()
		statusCode := c.Response().StatusCode()

		if wsHub != nil && statusCode >= fiber.StatusInternalServerError {
			message := strings.TrimSpace(string(c.Response().Body()))
			if message == "" {
				if err != nil {
					message = err.Error()
				} else {
					message = "internal server error"
				}
			}

			if len(message) > 500 {
				message = message[:500]
			}

			wsHub.BroadcastToRole("admin", "BACKEND_ERROR_LOG", fiber.Map{
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"path":      c.Path(),
				"method":    c.Method(),
				"status":    statusCode,
				"message":   message,
			})
		}

		return err
	}
}
