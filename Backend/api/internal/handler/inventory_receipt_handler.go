package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type InventoryReceiptHandler struct {
	service service.InventoryReceiptService
}

func NewInventoryReceiptHandler(receiptService service.InventoryReceiptService) *InventoryReceiptHandler {
	return &InventoryReceiptHandler{service: receiptService}
}

func (h *InventoryReceiptHandler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User session not available"})
	}

	var payload service.CreateInventoryReceiptPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	receipt, err := h.service.CreateReceipt(userID, payload)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(receipt)
}

func (h *InventoryReceiptHandler) GetStock(c *fiber.Ctx) error {
	stock, err := h.service.GetStock()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stock)
}
