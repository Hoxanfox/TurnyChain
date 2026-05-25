package handler

import (
	"strconv"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
)

// InvoiceHandler maneja endpoints de historial de facturas.
type InvoiceHandler struct {
	invoiceService service.InvoiceService
}

func NewInvoiceHandler(s service.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{invoiceService: s}
}

func (h *InvoiceHandler) GetInvoiceHistory(c *fiber.Ctx) error {
	query := strings.TrimSpace(c.Query("q"))
	day := strings.TrimSpace(c.Query("day"))
	month := strings.TrimSpace(c.Query("month"))
	limit := 50
	offset := 0

	if rawLimit := c.Query("limit"); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "limit invalido"})
		}
		if parsed > 200 {
			parsed = 200
		}
		limit = parsed
	}

	if rawOffset := c.Query("offset"); rawOffset != "" {
		parsed, err := strconv.Atoi(rawOffset)
		if err != nil || parsed < 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "offset invalido"})
		}
		offset = parsed
	}

	var from *time.Time
	var to *time.Time
	loc := time.Local
	if bogota, err := time.LoadLocation("America/Bogota"); err == nil {
		loc = bogota
	}

	if day != "" {
		parsed, err := time.ParseInLocation("2006-01-02", day, loc)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "day invalido, formato YYYY-MM-DD"})
		}
		start := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, loc)
		end := start.AddDate(0, 0, 1)
		from = &start
		to = &end
	} else if month != "" {
		parsed, err := time.ParseInLocation("2006-01", month, loc)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "month invalido, formato YYYY-MM"})
		}
		start := time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, loc)
		end := start.AddDate(0, 1, 0)
		from = &start
		to = &end
	}

	items, err := h.invoiceService.GetInvoiceHistory(query, from, to, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudo obtener el historial de facturas"})
	}

	return c.JSON(items)
}
