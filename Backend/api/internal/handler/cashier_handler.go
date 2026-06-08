package handler

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CashierHandler struct {
	cashierService service.CashierService
}

func NewCashierHandler(s service.CashierService) *CashierHandler {
	return &CashierHandler{cashierService: s}
}

type OpenSessionPayload struct {
	InitialFund float64 `json:"initial_fund"`
}

func (h *CashierHandler) OpenSession(c *fiber.Ctx) error {
	cashierID, err := getUserIDFromLocals(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
	}

	payload := new(OpenSessionPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	session, err := h.cashierService.OpenSession(cashierID, payload.InitialFund)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(session)
}

func (h *CashierHandler) GetActiveSession(c *fiber.Ctx) error {
	cashierID, err := getUserIDFromLocals(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
	}

	session, err := h.cashierService.GetActiveSession(cashierID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if session == nil {
		return c.JSON(nil) // Sin sesión activa
	}

	return c.JSON(session)
}

func (h *CashierHandler) RegisterExpense(c *fiber.Ctx) error {
	cashierID, err := getUserIDFromLocals(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
	}

	amountStr := c.FormValue("amount")
	description := c.FormValue("description")

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El monto del gasto es requerido y debe ser un número válido"})
	}
	if description == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La descripción del gasto es requerida"})
	}

	var imagePath *string
	file, fileErr := c.FormFile("file")
	if fileErr == nil {
		uploadDir := "./uploads/expenses"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudo crear el directorio de egresos"})
		}

		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("expense_%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
		destination := filepath.Join(uploadDir, filename)

		if err := c.SaveFile(file, destination); err != nil {
			log.Printf("❌ [CashierHandler] Error al guardar comprobante: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudo guardar el archivo adjunto"})
		}

		path := "/static/expenses/" + filename
		imagePath = &path
	}

	expense, err := h.cashierService.AddExpense(cashierID, amount, description, imagePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(expense)
}

type CloseSessionPayload struct {
	ActualCash float64 `json:"actual_cash"`
	Notes      string  `json:"notes"`
}

func (h *CashierHandler) CloseSession(c *fiber.Ctx) error {
	cashierID, err := getUserIDFromLocals(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
	}

	payload := new(CloseSessionPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	session, err := h.cashierService.CloseSession(cashierID, payload.ActualCash, payload.Notes)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(session)
}
