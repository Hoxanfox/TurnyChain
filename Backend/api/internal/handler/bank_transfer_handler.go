package handler

import (
	"log"
	"strconv"
	"time"

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

	// Notify cashiers and waiters in real time
	h.hub.BroadcastToRole("cajero", "BREB_TRANSFER_RECEIVED", transfer)
	h.hub.BroadcastToRole("mesero", "BREB_TRANSFER_RECEIVED", transfer)

	return c.Status(fiber.StatusCreated).JSON(transfer)
}

// ProcessEmail implements service.EmailProcessor for IMAP background worker
func (h *BankTransferHandler) ProcessEmail(subject string, body string) error {
	transfer, err := h.service.ProcessEmailWebhook(body)
	if err != nil {
		return err
	}

	h.hub.BroadcastToRole("cajero", "BREB_TRANSFER_RECEIVED", transfer)
	h.hub.BroadcastToRole("mesero", "BREB_TRANSFER_RECEIVED", transfer)
	return nil
}

func (h *BankTransferHandler) GetRecent(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 15)

	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	transfers, total, err := h.service.GetPaginatedRecent(offset, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not fetch transfers"})
	}

	return c.JSON(fiber.Map{
		"data":  transfers,
		"total": total,
		"page":  page,
		"limit": limit,
	})
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

	// Optionally notify via WS so other cashiers and waiters see it as used
	h.hub.BroadcastToRole("cajero", "BREB_TRANSFER_USED", payload.TransferID)
	h.hub.BroadcastToRole("mesero", "BREB_TRANSFER_USED", payload.TransferID)

	return c.JSON(fiber.Map{"success": true})
}

func (h *BankTransferHandler) SearchTransfers(c *fiber.Ctx) error {
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)

	if startTimeStr == "" || endTimeStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "start_time and end_time are required"})
	}

	// Parse times assuming RFC3339 format from frontend
	startTime, err := time.Parse(time.RFC3339, startTimeStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid start_time format, expected RFC3339"})
	}

	endTime, err := time.Parse(time.RFC3339, endTimeStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid end_time format, expected RFC3339"})
	}

	amountStr := c.Query("amount")
	var amount *float64
	if amountStr != "" {
		// attempt to parse amount
		parsedAmount, errAmount := strconv.ParseFloat(amountStr, 64)
		if errAmount == nil {
			amount = &parsedAmount
		}
	}

	offset := (page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	transfers, total, err := h.service.SearchTransfers(startTime, endTime, amount, offset, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not search transfers"})
	}

	return c.JSON(fiber.Map{
		"data":  transfers,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
