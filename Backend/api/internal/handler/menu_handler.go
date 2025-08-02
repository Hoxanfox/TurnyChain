// =================================================================
// ARCHIVO 3: /internal/handler/menu_handler.go (ACTUALIZADO)
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type MenuHandler struct {
	menuService service.MenuService
}

func NewMenuHandler(s service.MenuService) *MenuHandler {
	return &MenuHandler{menuService: s}
}

type MenuItemPayload struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
}

func (h *MenuHandler) CreateMenuItem(c *fiber.Ctx) error {
	payload := new(MenuItemPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	item, err := h.menuService.CreateMenuItem(payload.Name, payload.Description, payload.Category, payload.Price)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create menu item"})
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *MenuHandler) GetMenuItems(c *fiber.Ctx) error {
	items, err := h.menuService.GetMenuItems()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not retrieve menu items"})
	}
	return c.JSON(items)
}

// UpdateMenuItem maneja la actualización de un ítem del menú. // <-- NUEVO
func (h *MenuHandler) UpdateMenuItem(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid menu item ID"})
	}

	payload := new(MenuItemPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	item, err := h.menuService.UpdateMenuItem(id, payload.Name, payload.Description, payload.Category, payload.Price)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update menu item"})
	}
	return c.JSON(item)
}

// DeleteMenuItem maneja la eliminación de un ítem del menú. // <-- NUEVO
func (h *MenuHandler) DeleteMenuItem(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid menu item ID"})
	}

	if err := h.menuService.DeleteMenuItem(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete menu item"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}