package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type StockHandler struct{ service service.StockService }
func NewStockHandler(s service.StockService) *StockHandler { return &StockHandler{service: s} }
func (h *StockHandler) GetItems(c *fiber.Ctx) error {
	items, err := h.service.GetItems()
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not retrieve stock"}) }
	return c.JSON(items)
}
func (h *StockHandler) SetQuantity(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"}) }
	var payload struct { Quantity *float64 `json:"quantity"` }
	if err := c.BodyParser(&payload); err != nil || payload.Quantity == nil || *payload.Quantity < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Quantity must be zero or greater"})
	}
	if err := h.service.SetQuantity(id, *payload.Quantity); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	return c.SendStatus(fiber.StatusNoContent)
}
func (h *StockHandler) UpdateLocations(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"}) }
	var payload struct { Warehouse *float64 `json:"warehouse_quantity"`; Display *float64 `json:"display_quantity"` }
	if err := c.BodyParser(&payload); err != nil || payload.Warehouse == nil || payload.Display == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Debes indicar bodega y vitrina"})
	}
	if err := h.service.UpdateLocations(id, *payload.Warehouse, *payload.Display); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	return c.SendStatus(fiber.StatusNoContent)
}
func (h *StockHandler) Receive(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok { return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User session not available"}) }
	var payload domain.StockReceipt
	if err := c.BodyParser(&payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"}) }
	if err := h.service.Receive(userID, payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	return c.SendStatus(fiber.StatusCreated)
}
func (h *StockHandler) DeleteQuantity(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid item ID"}) }
	if err := h.service.DeleteQuantity(id); err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not clear stock"}) }
	return c.SendStatus(fiber.StatusNoContent)
}
