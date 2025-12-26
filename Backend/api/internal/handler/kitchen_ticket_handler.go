// =================================================================
// Kitchen Ticket Handler
// =================================================================
package handler

import (
	"backend/internal/domain"
	"backend/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type KitchenTicketHandler struct {
	service *service.KitchenTicketService
}

func NewKitchenTicketHandler(service *service.KitchenTicketService) *KitchenTicketHandler {
	return &KitchenTicketHandler{service: service}
}

// GetTicketsPreview obtiene una vista previa de los tickets que se generarían para una orden
// GET /api/orders/:orderId/kitchen-tickets/preview
func (h *KitchenTicketHandler) GetTicketsPreview(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("orderId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Order ID inválido",
		})
	}

	response, err := h.service.GetTicketsPreview(orderID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al generar vista previa de tickets: " + err.Error(),
		})
	}

	return c.JSON(response)
}

// PrintKitchenTickets genera e imprime los tickets de cocina para una orden
// POST /api/orders/:orderId/kitchen-tickets/print
func (h *KitchenTicketHandler) PrintKitchenTickets(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("orderId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Order ID inválido",
		})
	}

	var req domain.PrintRequest
	if err := c.BodyParser(&req); err != nil {
		// Si no viene body, crear un PrintRequest por defecto
		req = domain.PrintRequest{
			OrderID: orderID,
			Reprint: false,
		}
	}

	// Asegurar que el orderID del body coincida con el de la URL
	req.OrderID = orderID

	response, err := h.service.PrintKitchenTickets(req.OrderID, req.Reprint)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al imprimir tickets: " + err.Error(),
		})
	}

	// Si hubo fallos parciales, devolver 207 Multi-Status
	if !response.Success {
		return c.Status(fiber.StatusMultiStatus).JSON(response)
	}

	return c.JSON(response)
}

