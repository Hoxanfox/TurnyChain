package handler

import (
	"fmt"
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

// GetDailySales devuelve las ventas agregadas por día (órdenes pagadas).
// Acepta from/to (YYYY-MM-DD). Si no se envían, usa los últimos 365 días.
func (h *InvoiceHandler) GetDailySales(c *fiber.Ctx) error {
	fromParam := strings.TrimSpace(c.Query("from"))
	toParam := strings.TrimSpace(c.Query("to"))

	loc := time.Local
	if bogota, err := time.LoadLocation("America/Bogota"); err == nil {
		loc = bogota
	}

	now := time.Now().In(loc)
	to := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, 1)
	from := to.AddDate(0, 0, -365)

	if toParam != "" {
		parsed, err := time.ParseInLocation("2006-01-02", toParam, loc)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "to invalido, formato YYYY-MM-DD"})
		}
		to = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, 1)
	}
	if fromParam != "" {
		parsed, err := time.ParseInLocation("2006-01-02", fromParam, loc)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "from invalido, formato YYYY-MM-DD"})
		}
		from = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, loc)
	}

	stats, err := h.invoiceService.GetDailySales(from, to)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudieron obtener las ventas diarias"})
	}

	return c.JSON(stats)
}

func (h *InvoiceHandler) GetMonthlySales(c *fiber.Ctx) error {
	from, to, err := parseSalesMonthRange(c.Query("from"), c.Query("to"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()}) }
	stats, err := h.invoiceService.GetMonthlySales(from, to)
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudieron obtener las ventas mensuales"}) }
	return c.JSON(stats)
}

func (h *InvoiceHandler) GetYearlySales(c *fiber.Ctx) error {
	loc := salesLocation()
	now := time.Now().In(loc)
	fromYear, toYear := now.Year()-4, now.Year()+1
	if raw := strings.TrimSpace(c.Query("from")); raw != "" {
		parsed, err := strconv.Atoi(raw); if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "from inválido, formato YYYY"}) }; fromYear = parsed
	}
	if raw := strings.TrimSpace(c.Query("to")); raw != "" {
		parsed, err := strconv.Atoi(raw); if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "to inválido, formato YYYY"}) }; toYear = parsed + 1
	}
	stats, err := h.invoiceService.GetYearlySales(time.Date(fromYear, time.January, 1, 0, 0, 0, 0, loc), time.Date(toYear, time.January, 1, 0, 0, 0, 0, loc))
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se pudieron obtener las ventas anuales"}) }
	return c.JSON(stats)
}

func salesLocation() *time.Location {
	if loc, err := time.LoadLocation("America/Bogota"); err == nil { return loc }
	return time.FixedZone("America/Bogota", -5*60*60)
}

func parseSalesMonthRange(rawFrom, rawTo string) (time.Time, time.Time, error) {
	loc := salesLocation()
	now := time.Now().In(loc)
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc).AddDate(0, -11, 0)
	to := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc).AddDate(0, 1, 0)
	if strings.TrimSpace(rawFrom) != "" {
		parsed, err := time.ParseInLocation("2006-01", strings.TrimSpace(rawFrom), loc); if err != nil { return time.Time{}, time.Time{}, fmt.Errorf("from inválido, formato YYYY-MM") }
		from = time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, loc)
	}
	if strings.TrimSpace(rawTo) != "" {
		parsed, err := time.ParseInLocation("2006-01", strings.TrimSpace(rawTo), loc); if err != nil { return time.Time{}, time.Time{}, fmt.Errorf("to inválido, formato YYYY-MM") }
		to = time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, loc).AddDate(0, 1, 0)
	}
	return from, to, nil
}
