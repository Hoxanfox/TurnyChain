// =================================================================
// Station Handler
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type StationHandler struct {
	service *service.StationService
}

func NewStationHandler(service *service.StationService) *StationHandler {
	return &StationHandler{service: service}
}

// GetAll obtiene todas las estaciones
// GET /api/stations
func (h *StationHandler) GetAll(c *fiber.Ctx) error {
	stations, err := h.service.GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al obtener estaciones: " + err.Error(),
		})
	}
	return c.JSON(stations)
}

// GetAllActive obtiene solo las estaciones activas
// GET /api/stations/active
func (h *StationHandler) GetAllActive(c *fiber.Ctx) error {
	stations, err := h.service.GetAllActive()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al obtener estaciones activas: " + err.Error(),
		})
	}
	return c.JSON(stations)
}

// GetByID obtiene una estación por ID
// GET /api/stations/:id
func (h *StationHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID inválido",
		})
	}

	station, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(station)
}

// Create crea una nueva estación
// POST /api/stations
func (h *StationHandler) Create(c *fiber.Ctx) error {
	var req domain.CreateStationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos: " + err.Error(),
		})
	}

	station, err := h.service.Create(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al crear estación: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(station)
}

// Update actualiza una estación
// PUT /api/stations/:id
func (h *StationHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID inválido",
		})
	}

	var req domain.UpdateStationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos: " + err.Error(),
		})
	}

	if err := h.service.Update(id, req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al actualizar estación: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Estación actualizada correctamente",
	})
}

// Delete elimina una estación (soft delete)
// DELETE /api/stations/:id
func (h *StationHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID inválido",
		})
	}

	if err := h.service.Delete(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al eliminar estación: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Estación eliminada correctamente",
	})
}
