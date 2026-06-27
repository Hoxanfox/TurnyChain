package handler

import (
	"log"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/gofiber/fiber/v2"
)

type BankTransferHandler struct {
	service service.BankTransferService
	hub     *websocket.Hub
}

func NewBankTransferHandler(s service.BankTransferService, hub *websocket.Hub) *BankTransferHandler {
	return &BankTransferHandler{service: s, hub: hub}
}

// Webhook for receiving raw email text
func (h *BankTransferHandler) HandleWebhook(c *fiber.Ctx) error {
	payload := struct {
		RawText string `json:"raw_text"`
	}{}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	transfer, err := h.service.ProcessEmailWebhook(payload.RawText)
	if err != nil {
		log.Printf("Error processing bank transfer webhook: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Notify cashiers in real time
	h.hub.BroadcastToRole("cajero", "BREB_TRANSFER_RECEIVED", transfer)

	return c.Status(fiber.StatusCreated).JSON(transfer)
}

// ProcessEmail implements service.EmailProcessor for IMAP background worker
func (h *BankTransferHandler) ProcessEmail(subject string, body string) error {
	transfer, err := h.service.ProcessEmailWebhook(body)
	if err != nil {
		return err
	}

	h.hub.BroadcastToRole("cajero", "BREB_TRANSFER_RECEIVED", transfer)
	return nil
}

func (h *BankTransferHandler) GetRecent(c *fiber.Ctx) error {
	transfers, err := h.service.GetRecent()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch transfers"})
	}
	return c.JSON(transfers)
}

func (h *BankTransferHandler) LinkToOrder(c *fiber.Ctx) error {
	payload := struct {
		TransferID string `json:"transfer_id"`
		OrderID    string `json:"order_id"`
	}{}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if err := h.service.MarkAsUsed(payload.TransferID, payload.OrderID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not link transfer"})
	}

	// Optionally notify via WS so other cashiers see it as used
	h.hub.BroadcastToRole("cajero", "BREB_TRANSFER_USED", payload.TransferID)

	return c.JSON(fiber.Map{"success": true})
}
