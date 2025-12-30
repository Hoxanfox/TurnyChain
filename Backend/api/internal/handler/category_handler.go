// =================================================================
// ARCHIVO 7: /internal/handler/category_handler.go
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CategoryHandler struct { service service.CategoryService }
func NewCategoryHandler(s service.CategoryService) *CategoryHandler { return &CategoryHandler{service: s} }

type CategoryPayload struct {
	Name      string  `json:"name"`
	StationID *string `json:"station_id,omitempty"`
}

func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	payload := new(CategoryPayload)
	if err := c.BodyParser(payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"}) }

	var stationID *uuid.UUID
	if payload.StationID != nil && *payload.StationID != "" {
		sid, err := uuid.Parse(*payload.StationID)
		if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid station_id"}) }
		stationID = &sid
	}

	cat, err := h.service.Create(payload.Name, stationID)
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create category"}) }
	return c.Status(fiber.StatusCreated).JSON(cat)
}

func (h *CategoryHandler) GetAll(c *fiber.Ctx) error {
	cats, err := h.service.GetAll()
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not get categories"}) }
	return c.JSON(cats)
}

func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"}) }
	payload := new(CategoryPayload)
	if err := c.BodyParser(payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"}) }

	var stationID *uuid.UUID
	if payload.StationID != nil && *payload.StationID != "" {
		sid, err := uuid.Parse(*payload.StationID)
		if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid station_id"}) }
		stationID = &sid
	}

	cat, err := h.service.Update(id, payload.Name, stationID)
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update category"}) }
	return c.JSON(cat)
}

func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"}) }
	if err := h.service.Delete(id); err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete category"}) }
	return c.SendStatus(fiber.StatusNoContent)
}