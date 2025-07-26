// =================================================================
// ARCHIVO 3: /internal/handler/user_handler.go (ACTUALIZADO)
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(s service.UserService) *UserHandler {
	return &UserHandler{userService: s}
}

type CreateUserPayload struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// UpdateUserPayload define la estructura para actualizar un usuario. // <-- NUEVO
type UpdateUserPayload struct {
	Username string `json:"username"`
	Role     string `json:"role"`
}

func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	payload := new(CreateUserPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	user, err := h.userService.CreateUser(payload.Username, payload.Password, payload.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create user"})
	}
	return c.Status(fiber.StatusCreated).JSON(user)
}

func (h *UserHandler) GetUsers(c *fiber.Ctx) error {
    users, err := h.userService.GetUsers()
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not retrieve users"})
    }
    return c.JSON(users)
}

// UpdateUser maneja la actualización de un usuario. // <-- NUEVO
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	payload := new(UpdateUserPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	user, err := h.userService.UpdateUser(id, payload.Username, payload.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update user"})
	}
	return c.JSON(user)
}

// DeleteUser maneja la eliminación de un usuario. // <-- NUEVO
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	if err := h.userService.DeleteUser(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete user"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}