// =================================================================
// Kitchen Ticket Handler
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
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

// GetTicketsPreviewByStation obtiene la comanda de una estación específica para una orden
// GET /api/orders/:orderId/kitchen-tickets/preview/station/:stationId
func (h *KitchenTicketHandler) GetTicketsPreviewByStation(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("orderId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Order ID inválido",
		})
	}

	stationID, err := uuid.Parse(c.Params("stationId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Station ID inválido",
		})
	}

	ticket, err := h.service.GetTicketsPreviewByStation(orderID, stationID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(ticket)
}

// PrintKitchenTicketsByStation imprime la comanda de una sola estación
// POST /api/orders/:orderId/kitchen-tickets/print/station/:stationId
func (h *KitchenTicketHandler) PrintKitchenTicketsByStation(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("orderId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Order ID inválido",
		})
	}

	stationID, err := uuid.Parse(c.Params("stationId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Station ID inválido",
		})
	}

	response, err := h.service.PrintKitchenTicketsByStation(orderID, stationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al imprimir ticket: " + err.Error(),
		})
	}

	if !response.Success {
		return c.Status(fiber.StatusMultiStatus).JSON(response)
	}

	return c.JSON(response)
}

// PrintGlobalCashTicket imprime la comanda global en la estación Caja
// POST /api/orders/:orderId/kitchen-tickets/print/caja
func (h *KitchenTicketHandler) PrintGlobalCashTicket(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("orderId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Order ID inválido",
		})
	}

	response, err := h.service.PrintGlobalOrderTicketResponse(orderID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al imprimir ticket de Caja: " + err.Error(),
		})
	}

	if !response.Success {
		return c.Status(fiber.StatusMultiStatus).JSON(response)
	}

	return c.JSON(response)
}
