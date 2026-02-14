// =================================================================
// ARCHIVO 3: /internal/handler/menu_handler.go (CORREGIDO Y COMPLETO)
// =================================================================
package handler

import (
	"fmt"
	"log"

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

func (h *MenuHandler) CreateMenuItem(c *fiber.Ctx) error {
	payload := new(service.CreateMenuItemPayload)
	if err := c.BodyParser(payload); err != nil {
		log.Printf("❌ Error parsing CreateMenuItem JSON: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	
	log.Printf("✅ CreateMenuItem request: name=%s, category_id=%s, ingredients=%v, accompaniments=%v", 
		payload.Name, payload.CategoryID, payload.IngredientIDs, payload.AccompanimentIDs)
	
	item, err := h.menuService.CreateMenuItem(*payload)
	if err != nil {
		log.Printf("❌ Error creating menu item: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Could not create menu item: %v", err)})
	}
	
	log.Printf("✅ Menu item created successfully: id=%s, name=%s", item.ID, item.Name)
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *MenuHandler) GetMenuItems(c *fiber.Ctx) error {
	items, err := h.menuService.GetMenuItems()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not retrieve menu items"})
	}
	return c.JSON(items)
}

func (h *MenuHandler) UpdateMenuItem(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		log.Printf("❌ Invalid menu item ID: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid menu item ID"})
	}
	
	payload := new(service.UpdateMenuItemPayload)
	if err := c.BodyParser(payload); err != nil {
		log.Printf("❌ Error parsing UpdateMenuItem JSON: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	
	log.Printf("✅ UpdateMenuItem request: id=%s, name=%s, category_id=%s, ingredients=%v, accompaniments=%v", 
		id, payload.Name, payload.CategoryID, payload.IngredientIDs, payload.AccompanimentIDs)
	
	item, err := h.menuService.UpdateMenuItem(id, *payload)
	if err != nil {
		log.Printf("❌ Error updating menu item: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Could not update menu item: %v", err)})
	}
	
	log.Printf("✅ Menu item updated successfully: id=%s, name=%s", item.ID, item.Name)
	return c.JSON(item)
}

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

func (h *MenuHandler) IncrementOrderCount(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid menu item ID"})
	}
	if err := h.menuService.IncrementOrderCount(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not increment order count"})
	}
	return c.JSON(fiber.Map{"message": "Order count incremented successfully"})
}
