// =================================================================
// ARCHIVO 4: /internal/service/order_service.go (ACTUALIZADO)
// Propósito: Validar la mesa antes de crear la orden.
// =================================================================
package service

import (
	"errors"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

type OrderService interface {
	CreateOrder(waiterID uuid.UUID, tableNumber int, items []domain.OrderItem) (*domain.Order, error)
	GetOrders(userRole string, userID uuid.UUID, status string) ([]domain.Order, error)
	GetOrderByID(orderID uuid.UUID) (*domain.Order, error)
	UpdateOrderStatus(orderID, userID uuid.UUID, newStatus string) (*domain.Order, error)
	ManageOrderAsAdmin(orderID uuid.UUID, status *string, newWaiterID *uuid.UUID) (*domain.Order, error)
	ApproveOrder(orderID, cashierID uuid.UUID) (*domain.Order, error) // <-- ¡CORRECCIÓN!
	UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem) (*domain.Order, error) // <-- NUEVO
}


type orderService struct {
	orderRepo repository.OrderRepository
	tableRepo repository.TableRepository // <-- NUEVA DEPENDENCIA
	wsHub     *wshub.Hub
}

func NewOrderService(orderRepo repository.OrderRepository, tableRepo repository.TableRepository, wsHub *wshub.Hub) OrderService {
	return &orderService{
		orderRepo: orderRepo,
		tableRepo: tableRepo, // <-- NUEVA DEPENDENCIA
		wsHub:     wsHub,
	}
}

func (s *orderService) CreateOrder(waiterID uuid.UUID, tableNumber int, items []domain.OrderItem) (*domain.Order, error) {
	if len(items) == 0 {
		return nil, errors.New("la orden no puede estar vacía")
	}

    // CORRECCIÓN: Validamos que la mesa exista y esté activa antes de crear la orden.
    table, err := s.tableRepo.GetByNumber(tableNumber)
    if err != nil {
        return nil, errors.New("la mesa seleccionada no es válida o no está activa")
    }

	var total float64
	for _, item := range items {
		total += item.PriceAtOrder * float64(item.Quantity)
	}

	order := &domain.Order{
		WaiterID:    waiterID,
		TableID:     table.ID, // <-- AÑADIMOS EL ID DE LA MESA
		TableNumber: tableNumber,
		Status:      "pendiente_aprobacion",
		Total:       total,
		Items:       items,
	}

	createdOrder, err := s.orderRepo.CreateOrder(order)
	if err != nil {
		return nil, err
	}

	s.wsHub.BroadcastMessage("NEW_PENDING_ORDER", createdOrder)
	return createdOrder, nil
}

func (s *orderService) GetOrders(userRole string, userID uuid.UUID, status string) ([]domain.Order, error) {
    filters := make(map[string]interface{})
    if status != "" {
        filters["status"] = status
    }
    if userRole == "mesero" {
        filters["waiter_id"] = userID
    }
    return s.orderRepo.GetOrders(filters)
}

func (s *orderService) GetOrderByID(orderID uuid.UUID) (*domain.Order, error) {
	return s.orderRepo.GetOrderByID(orderID)
}

func (s *orderService) UpdateOrderStatus(orderID, userID uuid.UUID, newStatus string) (*domain.Order, error) {
	updatedOrder, err := s.orderRepo.UpdateOrderStatus(orderID, userID, newStatus)
	if err != nil {
		return nil, err
	}
	// ¡NUEVO! Notificar a todos los clientes sobre la actualización de estado
	s.wsHub.BroadcastMessage("ORDER_STATUS_UPDATED", updatedOrder)
	return updatedOrder, nil
}

func (s *orderService) ManageOrderAsAdmin(orderID uuid.UUID, status *string, newWaiterID *uuid.UUID) (*domain.Order, error) {
	updates := make(map[string]interface{})
	if status != nil && *status == "cancelado" {
		updates["status"] = *status
	}
	if newWaiterID != nil {
		updates["waiter_id"] = *newWaiterID
	}
	if len(updates) == 0 {
		return nil, errors.New("no valid update provided for admin management")
	}
	
	managedOrder, err := s.orderRepo.ManageOrder(orderID, updates)
	if err != nil {
		return nil, err
	}
	// ¡NUEVO! Notificar a todos los clientes sobre la gestión de la orden
	s.wsHub.BroadcastMessage("ORDER_MANAGED", managedOrder)
	return managedOrder, nil
}


// ApproveOrder es un caso específico de UpdateOrderStatus.
func (s *orderService) ApproveOrder(orderID, cashierID uuid.UUID) (*domain.Order, error) {
	return s.UpdateOrderStatus(orderID, cashierID, "recibido")
}

// UpdateOrderItems permite a un cajero modificar los ítems de una orden. // <-- NUEVO
func (s *orderService) UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem) (*domain.Order, error) {
	var newTotal float64
	for _, item := range items {
		newTotal += item.PriceAtOrder * float64(item.Quantity)
	}

	err := s.orderRepo.UpdateOrderItems(orderID, items, newTotal)
	if err != nil {
		return nil, err
	}

	updatedOrder, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return nil, err
	}

	s.wsHub.BroadcastMessage("ORDER_ITEMS_UPDATED", updatedOrder)
	return updatedOrder, nil
}