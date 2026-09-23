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
	_ = h.service.DeleteDraft(userID)
	return c.Status(fiber.StatusCreated).JSON(receipt)
}

func (h *InventoryReceiptHandler) SaveDraft(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User session not available"})
	}
	var payload service.CreateInventoryReceiptPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if err := h.service.SaveDraft(userID, payload); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *InventoryReceiptHandler) GetDraft(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User session not available"})
	}
	payload, err := h.service.GetDraft(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "No draft found"})
	}
	return c.JSON(payload)
}

func (h *InventoryReceiptHandler) DeleteDraft(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User session not available"})
	}
	if err := h.service.DeleteDraft(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *InventoryReceiptHandler) GetStock(c *fiber.Ctx) error {
	stock, err := h.service.GetStock()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stock)
}

func (h *InventoryReceiptHandler) GetHistory(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User session not available"})
	}
	role, _ := c.Locals("user_role").(string)
	receipts, err := h.service.GetReceipts(userID, role == "cajero" || role == "admin")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(receipts)
}

func (h *InventoryReceiptHandler) Update(c *fiber.Ctx) error {
	receiptID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid receipt id"})
	}
	var payload service.CreateInventoryReceiptPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	receipt, err := h.service.UpdateReceipt(receiptID, payload)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(receipt)
}

func (h *InventoryReceiptHandler) Delete(c *fiber.Ctx) error {
	receiptID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid receipt id"})
	}
	if err := h.service.DeleteReceipt(receiptID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
