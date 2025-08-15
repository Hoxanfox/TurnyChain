// =================================================================
// ARCHIVO 6: /internal/handler/accompaniment_handler.go (NUEVO)
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AccompanimentHandler struct { service service.AccompanimentService }
func NewAccompanimentHandler(s service.AccompanimentService) *AccompanimentHandler { return &AccompanimentHandler{service: s} }

type AccompanimentPayload struct { Name string `json:"name"`; Price float64 `json:"price"` }

func (h *AccompanimentHandler) Create(c *fiber.Ctx) error {
	payload := new(AccompanimentPayload)
	if err := c.BodyParser(payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"}) }
	acc, err := h.service.Create(payload.Name, payload.Price)
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create accompaniment"}) }
	return c.Status(fiber.StatusCreated).JSON(acc)
}

func (h *AccompanimentHandler) GetAll(c *fiber.Ctx) error {
	accs, err := h.service.GetAll()
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not get accompaniments"}) }
	return c.JSON(accs)
}

func (h *AccompanimentHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"}) }
	payload := new(AccompanimentPayload)
	if err := c.BodyParser(payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"}) }
	acc, err := h.service.Update(id, payload.Name, payload.Price)
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update accompaniment"}) }
	return c.JSON(acc)
}

func (h *AccompanimentHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"}) }
	if err := h.service.Delete(id); err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete accompaniment"}) }
	return c.SendStatus(fiber.StatusNoContent)
}