// =================================================================
// ARCHIVO 6: /internal/handler/table_handler.go (NUEVO ARCHIVO)
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
)

type TableHandler struct { service service.TableService }

func NewTableHandler(s service.TableService) *TableHandler {
	return &TableHandler{service: s}
}

func (h *TableHandler) Create(c *fiber.Ctx) error {
	payload := struct { TableNumber int `json:"table_number"` }{}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	table, err := h.service.Create(payload.TableNumber)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not create table"})
	}
	return c.Status(fiber.StatusCreated).JSON(table)
}

func (h *TableHandler) GetAll(c *fiber.Ctx) error {
	tables, err := h.service.GetAll(true)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not get tables"})
	}
	return c.JSON(tables)
}