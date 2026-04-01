// =================================================================
// Printer Handler
// =================================================================
package handler

import (
	"fmt"
	"net"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/utils"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type PrinterHandler struct {
	service *service.PrinterService
}

func NewPrinterHandler(service *service.PrinterService) *PrinterHandler {
	return &PrinterHandler{service: service}
}

// GetAll obtiene todas las impresoras
// GET /api/printers
func (h *PrinterHandler) GetAll(c *fiber.Ctx) error {
	printers, err := h.service.GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al obtener impresoras: " + err.Error(),
		})
	}
	return c.JSON(printers)
}

// GetAllActive obtiene solo las impresoras activas
// GET /api/printers/active
func (h *PrinterHandler) GetAllActive(c *fiber.Ctx) error {
	printers, err := h.service.GetAllActive()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al obtener impresoras activas: " + err.Error(),
		})
	}
	return c.JSON(printers)
}

// CheckOperational valida conectividad de impresoras activas sin enviar tickets
// GET /api/printers/operational-check
func (h *PrinterHandler) CheckOperational(c *fiber.Ctx) error {
	printers, err := h.service.GetAllActive()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Error al obtener impresoras activas: " + err.Error(),
		})
	}

	type printerStatus struct {
		ID    uuid.UUID `json:"id"`
		Name  string    `json:"name"`
		OK    bool      `json:"ok"`
		Error string    `json:"error,omitempty"`
	}

	statuses := make([]printerStatus, 0, len(printers))
	operationalCount := 0

	for _, printer := range printers {
		status := printerStatus{ID: printer.ID, Name: printer.Name, OK: false}

		switch printer.PrinterType {
		case domain.PrinterTypePDF:
			status.OK = true
		default:
			address := fmt.Sprintf("%s:%d", printer.IPAddress, printer.Port)
			conn, dialErr := net.DialTimeout("tcp", address, 1200*time.Millisecond)
			if dialErr != nil {
				status.Error = dialErr.Error()
			} else {
				_ = conn.Close()
				status.OK = true
			}
		}

		if status.OK {
			operationalCount++
		}
		statuses = append(statuses, status)
	}

	if len(printers) == 0 {
		return c.JSON(fiber.Map{
			"success":           false,
			"message":           "No hay impresoras activas configuradas",
			"active_count":      0,
			"operational_count": 0,
			"printers":          statuses,
		})
	}

	if operationalCount == 0 {
		return c.JSON(fiber.Map{
			"success":           false,
			"message":           "No hay impresoras operativas en este momento",
			"active_count":      len(printers),
			"operational_count": operationalCount,
			"printers":          statuses,
		})
	}

	return c.JSON(fiber.Map{
		"success":           true,
		"message":           "Hay al menos una impresora operativa",
		"active_count":      len(printers),
		"operational_count": operationalCount,
		"printers":          statuses,
	})
}

// GetByID obtiene una impresora por ID
// GET /api/printers/:id
func (h *PrinterHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID inválido",
		})
	}

	printer, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(printer)
}

// GetByStationID obtiene todas las impresoras de una estación
// GET /api/stations/:stationId/printers
func (h *PrinterHandler) GetByStationID(c *fiber.Ctx) error {
	stationID, err := uuid.Parse(c.Params("stationId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Station ID inválido",
		})
	}

	printers, err := h.service.GetByStationID(stationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al obtener impresoras: " + err.Error(),
		})
	}

	return c.JSON(printers)
}

// Create crea una nueva impresora
// POST /api/printers
func (h *PrinterHandler) Create(c *fiber.Ctx) error {
	var req domain.CreatePrinterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos: " + err.Error(),
		})
	}

	printer, err := h.service.Create(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al crear impresora: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(printer)
}

// Update actualiza una impresora
// PUT /api/printers/:id
func (h *PrinterHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID inválido",
		})
	}

	var req domain.UpdatePrinterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos: " + err.Error(),
		})
	}

	if err := h.service.Update(id, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al actualizar impresora: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Impresora actualizada correctamente",
	})
}

// Delete elimina una impresora (soft delete)
// DELETE /api/printers/:id
func (h *PrinterHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID inválido",
		})
	}

	if err := h.service.Delete(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al eliminar impresora: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Impresora eliminada correctamente",
	})
}

// TestConnection prueba la conexión con una impresora
// POST /api/printers/:id/test
func (h *PrinterHandler) TestConnection(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID inválido",
		})
	}

	// Obtener la impresora
	printer, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Probar conexión según el tipo de impresora
	switch printer.PrinterType {
	case domain.PrinterTypeESCPOS:
		escposPrinter := utils.NewESCPOSPrinter(printer.IPAddress, printer.Port)
		err := escposPrinter.TestConnection()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Error al conectar con la impresora: " + err.Error(),
			})
		}
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Conexión exitosa. Se ha enviado un ticket de prueba.",
		})

	case domain.PrinterTypePDF:
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Tipo PDF - No requiere prueba de conexión de red",
		})

	case domain.PrinterTypeRaw:
		return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
			"success": false,
			"error":   "Prueba de conexión para tipo Raw no implementada",
		})

	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Tipo de impresora no soportado",
		})
	}
}
