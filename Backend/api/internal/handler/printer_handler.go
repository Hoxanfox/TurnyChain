// =================================================================
// Printer Handler
// =================================================================
package handler

import (
	"backend/internal/domain"
	"backend/internal/service"

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

