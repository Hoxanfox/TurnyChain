// =================================================================
// ARCHIVO 3: /internal/handler/ingredient_handler.go (NUEVO)
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type IngredientHandler struct { service service.IngredientService }
func NewIngredientHandler(s service.IngredientService) *IngredientHandler { return &IngredientHandler{service: s} }

type IngredientPayload struct { Name string `json:"name"` }

func (h *IngredientHandler) Create(c *fiber.Ctx) error {
	payload := new(IngredientPayload)
	if err := c.BodyParser(payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"}) }
	ingredient, err := h.service.Create(payload.Name)
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create ingredient"}) }
	return c.Status(fiber.StatusCreated).JSON(ingredient)
}

func (h *IngredientHandler) GetAll(c *fiber.Ctx) error {
	ingredients, err := h.service.GetAll()
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not get ingredients"}) }
	return c.JSON(ingredients)
}

func (h *IngredientHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"}) }
	payload := new(IngredientPayload)
	if err := c.BodyParser(payload); err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"}) }
	ingredient, err := h.service.Update(id, payload.Name)
	if err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update ingredient"}) }
	return c.JSON(ingredient)
}

func (h *IngredientHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil { return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"}) }
	if err := h.service.Delete(id); err != nil { return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not delete ingredient"}) }
	return c.SendStatus(fiber.StatusNoContent)
}