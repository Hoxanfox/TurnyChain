package handler

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CashRegisterHandler struct {
	Service service.CashRegisterService
}

func NewCashRegisterHandler(svc service.CashRegisterService) *CashRegisterHandler {
	return &CashRegisterHandler{Service: svc}
}

type OpenSessionRequest struct {
	InitialCash     float64 `json:"initial_cash"`
	InitialTransfer float64 `json:"initial_transfer"`
}

func (h *CashRegisterHandler) OpenSession(c *fiber.Ctx) error {
	var req OpenSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	session, err := h.Service.OpenSession(req.InitialCash, req.InitialTransfer)
	if err != nil {
		if err.Error() == "there is already an open session" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(session)
}

func (h *CashRegisterHandler) GetCurrentSession(c *fiber.Ctx) error {
	details, err := h.Service.GetCurrentSessionDetails()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(details)
}

func (h *CashRegisterHandler) GetClosingDetails(c *fiber.Ctx) error {
	details, err := h.Service.GetClosingSessionDetails()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(details)
}

func (h *CashRegisterHandler) AddExpense(c *fiber.Ctx) error {
	amountStr := c.FormValue("amount")
	description := c.FormValue("description")

	var amount float64
	if _, err := fmt.Sscanf(amountStr, "%f", &amount); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid amount"})
	}

	if description == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Description is required"})
	}

	var imagePath *string

	file, err := c.FormFile("image")
	if err == nil {
		// Crear carpeta uploads/expenses si no existe
		if err := os.MkdirAll(filepath.Join("uploads", "expenses"), os.ModePerm); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create upload directory"})
		}

		fileName := fmt.Sprintf("%s%s", uuid.New().String(), filepath.Ext(file.Filename))
		path := filepath.Join("uploads", "expenses", fileName)
		
		if err := c.SaveFile(file, path); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not save image"})
		}
		// Guardamos la ruta relativa para servirla
		relativePath := "expenses/" + fileName
		imagePath = &relativePath
	}

	expense, err := h.Service.AddExpense(amount, description, imagePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(expense)
}

type CloseSessionRequest struct {
	FinalCashActual     float64 `json:"final_cash_actual"`
	FinalTransferActual float64 `json:"final_transfer_actual"`
	Justification       *string `json:"justification,omitempty"`
}

func (h *CashRegisterHandler) CloseSession(c *fiber.Ctx) error {
	var req CloseSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	session, err := h.Service.CloseSession(req.FinalCashActual, req.FinalTransferActual, req.Justification)
	if err != nil {
		if err.Error() == "DISCREPANCY_NEEDS_JUSTIFICATION" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(session)
}
