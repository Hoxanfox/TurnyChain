
// =================================================================
// ARCHIVO 6: /internal/handler/auth_handler.go (ACTUALIZADO)
// Propósito: Manejador para la ruta de login.
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(s service.AuthService) *AuthHandler {
	return &AuthHandler{authService: s}
}

type LoginPayload struct {
	Username string `json:"username"`
	Password string `json:"password"`
	DeviceID string `json:"device_id"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	payload := new(LoginPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	token, err := h.authService.Login(payload.Username, payload.Password, payload.DeviceID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"token": token})
}

func (h *AuthHandler) VerifyPassword(c *fiber.Ctx) error {
	var payload struct {
		Password string `json:"password"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	userIDRaw := c.Locals("user_id")
	if userIDRaw == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var userID uuid.UUID
	switch v := userIDRaw.(type) {
	case string:
		var err error
		userID, err = uuid.Parse(v)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user ID string in token"})
		}
	case uuid.UUID:
		userID = v
	default:
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user ID type in token"})
	}

	err := h.authService.VerifyPassword(userID, payload.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Password verified successfully"})
}

func (h *AuthHandler) ValidateSession(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"valid":   true,
		"user_id": c.Locals("user_id"),
		"role":    c.Locals("user_role"),
	})
}