// =================================================================
// ARCHIVO 3: /internal/handler/order_handler.go (FINAL)
// =================================================================
package handler

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type OrderHandler struct {
	orderService service.OrderService
}

func NewOrderHandler(s service.OrderService) *OrderHandler {
	return &OrderHandler{orderService: s}
}

type CreateOrderPayload struct {
	TableNumber int               `json:"table_number"`
	Items       []domain.OrderItem `json:"items"`
}

func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
	payload := new(CreateOrderPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	waiterID, _ := uuid.Parse(c.Locals("user_id").(string))
	order, err := h.orderService.CreateOrder(waiterID, payload.TableNumber, payload.Items)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(order)
}

func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	userRole := c.Locals("user_role").(string)
	status := c.Query("status")
	orders, err := h.orderService.GetOrders(userRole, userID, status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not retrieve orders"})
	}
	return c.JSON(orders)
}

func (h *OrderHandler) GetOrderByID(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}
	order, err := h.orderService.GetOrderByID(orderID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
	}
	return c.JSON(order)
}

type UpdateOrderStatusPayload struct {
	Status string `json:"status"`
}

func (h *OrderHandler) UpdateOrderStatus(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}
	payload := new(UpdateOrderStatusPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	order, err := h.orderService.UpdateOrderStatus(orderID, userID, payload.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update order status"})
	}
	return c.JSON(order)
}

type UpdateOrderItemsPayload struct {
	Items []domain.OrderItem `json:"items"`
}

func (h *OrderHandler) UpdateOrderItems(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}
	payload := new(UpdateOrderItemsPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	order, err := h.orderService.UpdateOrderItems(orderID, payload.Items)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update order items"})
	}
	return c.JSON(order)
}

func (h *OrderHandler) ManageOrder(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}
	payload := struct {
		Status   *string    `json:"status"`
		WaiterID *uuid.UUID `json:"waiter_id"`
	}{}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	order, err := h.orderService.ManageOrderAsAdmin(orderID, payload.Status, payload.WaiterID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not manage order"})
	}
	return c.JSON(order)
}