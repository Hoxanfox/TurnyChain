// =================================================================
// ARCHIVO 2: /internal/service/order_service.go (FINAL)
// =================================================================
package service

import (
	"errors"
	"log"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

type OrderService interface {
	CreateOrder(waiterID uuid.UUID, tableNumber int, items []domain.OrderItem) (*domain.Order, error)
	GetOrders(userRole string, userID uuid.UUID, status string, myOrders string) ([]domain.Order, error)
	GetOrderByID(orderID uuid.UUID) (*domain.Order, error)
	UpdateOrderStatus(orderID, userID uuid.UUID, newStatus string) (*domain.Order, error)
	UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem) (*domain.Order, error)
	ManageOrderAsAdmin(orderID uuid.UUID, status *string, newWaiterID *uuid.UUID) (*domain.Order, error)
	AddPaymentProof(orderID uuid.UUID, method string, proofPath string) (*domain.Order, error)
}

type orderService struct {
	orderRepo         repository.OrderRepository
	tableRepo         repository.TableRepository
	menuRepo          repository.MenuRepository
	ingredientRepo    repository.IngredientRepository
	accompanimentRepo repository.AccompanimentRepository
	wsHub             *wshub.Hub
	blockchain        BlockchainService
}

func NewOrderService(
	orderRepo repository.OrderRepository,
	tableRepo repository.TableRepository,
	menuRepo repository.MenuRepository,
	ingredientRepo repository.IngredientRepository,
	accompanimentRepo repository.AccompanimentRepository,
	wsHub *wshub.Hub,
	bc BlockchainService,
) OrderService {
	return &orderService{
		orderRepo:         orderRepo,
		tableRepo:         tableRepo,
		menuRepo:          menuRepo,
		ingredientRepo:    ingredientRepo,
		accompanimentRepo: accompanimentRepo,
		wsHub:             wsHub,
		blockchain:        bc,
	}
}

func (s *orderService) CreateOrder(waiterID uuid.UUID, tableNumber int, items []domain.OrderItem) (*domain.Order, error) {
	if len(items) == 0 {
		return nil, errors.New("la orden no puede estar vacía")
	}

	table, err := s.tableRepo.GetByNumber(tableNumber)
	if err != nil {
		return nil, errors.New("la mesa seleccionada no es válida o no está activa")
	}

	// Procesar customizaciones para cada item
	for i := range items {
		// Obtener todos los ingredientes y acompañantes del menu item
		allIngredients, allAccompaniments, err := s.menuRepo.GetMenuItemDetails(items[i].MenuItemID)
		if err != nil {
			log.Printf("⚠️ Error obteniendo detalles del menu item %s: %v", items[i].MenuItemID, err)
			allIngredients = []domain.Ingredient{}
			allAccompaniments = []domain.Accompaniment{}
		}

		if items[i].CustomizationsInput != nil {
			// Crear mapas para búsqueda rápida de IDs removidos/no seleccionados
			removedIngredientsMap := make(map[uuid.UUID]bool)
			for _, id := range items[i].CustomizationsInput.RemovedIngredientIDs {
				removedIngredientsMap[id] = true
			}

			unselectedAccompanimentsMap := make(map[uuid.UUID]bool)
			for _, id := range items[i].CustomizationsInput.UnselectedAccompanimentIDs {
				unselectedAccompanimentsMap[id] = true
			}

			// Filtrar ingredientes ACTIVOS (todos menos los removidos)
			activeIngredients := []domain.Ingredient{}
			for _, ingredient := range allIngredients {
				if !removedIngredientsMap[ingredient.ID] {
					activeIngredients = append(activeIngredients, ingredient)
				}
			}

			// Filtrar acompañamientos SELECCIONADOS (todos menos los no seleccionados)
			selectedAccompaniments := []domain.Accompaniment{}
			for _, accompaniment := range allAccompaniments {
				if !unselectedAccompanimentsMap[accompaniment.ID] {
					selectedAccompaniments = append(selectedAccompaniments, accompaniment)
				}
			}

			// Construir el objeto Customizations con solo lo que SÍ lleva el plato
			items[i].Customizations = domain.Customizations{
				ActiveIngredients:      activeIngredients,
				SelectedAccompaniments: selectedAccompaniments,
			}
		} else {
			// Si no hay customizaciones, devolver todo (sin filtros)
			items[i].Customizations = domain.Customizations{
				ActiveIngredients:      allIngredients,
				SelectedAccompaniments: allAccompaniments,
			}
		}
	}

	var total float64
	for _, item := range items {
		total += item.PriceAtOrder * float64(item.Quantity)
	}

	order := &domain.Order{
		WaiterID:    waiterID,
		TableID:     table.ID,
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

func (s *orderService) GetOrders(userRole string, userID uuid.UUID, status string, myOrders string) ([]domain.Order, error) {
	filters := make(map[string]interface{})
	if status != "" {
		filters["status"] = status
	}

	// Si my_orders=true, filtrar por waiter_id independientemente del rol
	if myOrders == "true" {
		filters["waiter_id"] = userID
	} else if userRole == "mesero" {
		// Si es mesero y no se especifica my_orders, filtrar por defecto
		filters["waiter_id"] = userID
	}

	return s.orderRepo.GetOrders(filters)
}

func (s *orderService) GetOrderByID(orderID uuid.UUID) (*domain.Order, error) {
	return s.orderRepo.GetOrderByID(orderID)
}

func (s *orderService) UpdateOrderStatus(orderID, userID uuid.UUID, newStatus string) (*domain.Order, error) {
	log.Printf("📊 [Service] Actualizando orden %s a estado '%s'", orderID.String(), newStatus)

	updatedOrder, err := s.orderRepo.UpdateOrderStatus(orderID, userID, newStatus)
	if err != nil {
		log.Printf("❌ [Service] Error actualizando estado: %v", err)
		return nil, err
	}

	// --- LÓGICA BLOCKCHAIN ---
	if newStatus == "pagado" && s.blockchain != nil {
		// IMPORTANTE: Obtener la orden COMPLETA con Items para la blockchain
		fullOrder, err := s.orderRepo.GetOrderByID(orderID)
		if err != nil {
			log.Printf("⚠️ No se pudo obtener la orden completa para blockchain: %v", err)
		} else {
			// Ejecutar en goroutine para no bloquear al usuario
			go func(ord *domain.Order) {
				_, err := s.blockchain.NotarizeOrder(ord)
				if err != nil {
					log.Printf("❌ Error Blockchain: %v", err)
				} else {
					log.Printf("✅ Orden %s notarizada en blockchain correctamente", ord.ID)
				}
			}(fullOrder)
		}
	}
	// -------------------------

	// Broadcast general
	s.wsHub.BroadcastMessage("ORDER_STATUS_UPDATED", updatedOrder)
	log.Printf("📡 [Service] Evento 'ORDER_STATUS_UPDATED' emitido para orden %s", orderID.String())

	// Notificar específicamente a cajeros si la orden requiere su atención
	if newStatus == "por_verificar" {
		s.wsHub.BroadcastToRole("cashier", "PAYMENT_VERIFICATION_PENDING", map[string]interface{}{
			"order_id":     updatedOrder.ID.String(),
			"table_number": updatedOrder.TableNumber,
			"method":       updatedOrder.PaymentMethod,
			"total":        updatedOrder.Total,
			"status":       updatedOrder.Status,
			"order":        updatedOrder,
		})
		log.Printf("📡 [Service] Notificación 'PAYMENT_VERIFICATION_PENDING' enviada a cajeros")
	} else if newStatus == "entregado" && updatedOrder.PaymentMethod != nil && *updatedOrder.PaymentMethod != "" {
		// Si una orden entregada tiene método de pago, significa que ya fue rechazada y está lista para reenvío
		s.wsHub.BroadcastToRole("cashier", "ORDER_READY_FOR_PAYMENT", map[string]interface{}{
			"order_id":     updatedOrder.ID.String(),
			"table_number": updatedOrder.TableNumber,
			"status":       updatedOrder.Status,
			"has_payment":  true,
			"order":        updatedOrder,
		})
		log.Printf("📡 [Service] Notificación 'ORDER_READY_FOR_PAYMENT' enviada a cajeros")
	}

	return updatedOrder, nil
}

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

func (s *orderService) ManageOrderAsAdmin(orderID uuid.UUID, status *string, newWaiterID *uuid.UUID) (*domain.Order, error) {
	updates := make(map[string]interface{})
	if status != nil {
		updates["status"] = *status
	}
	if newWaiterID != nil {
		updates["waiter_id"] = *newWaiterID
	}

	managedOrder, err := s.orderRepo.ManageOrder(orderID, updates)
	if err != nil {
		return nil, err
	}
	s.wsHub.BroadcastMessage("ORDER_MANAGED", managedOrder)
	return managedOrder, nil
}

func (s *orderService) AddPaymentProof(orderID uuid.UUID, method string, proofPath string) (*domain.Order, error) {
	// Validar método
	if method != "transferencia" && method != "efectivo" {
		return nil, errors.New("método de pago inválido")
	}

	log.Printf("📤 [Backend] Recibiendo comprobante para orden %s", orderID.String())
	log.Printf("   - Método: %s", method)
	log.Printf("   - Ruta comprobante: %s", proofPath)

	// Delegar al repositorio. El repositorio pone el status en 'por_verificar' cuando corresponda.
	order, err := s.orderRepo.AddPaymentProof(orderID, method, proofPath)
	if err != nil {
		log.Printf("❌ [Backend] Error al actualizar orden %s: %v", orderID.String(), err)
		return nil, err
	}

	log.Printf("✅ [Backend] Orden %s actualizada a estado '%s'", orderID.String(), order.Status)

	// Notificar via WebSocket broadcast general que la orden cambió
	s.wsHub.BroadcastMessage("ORDER_UPDATED", order)
	log.Printf("📡 [Backend] Evento broadcast 'ORDER_UPDATED' emitido para orden %s", orderID.String())

	// Notificar específicamente a los cajeros sobre verificación de pago pendiente
	s.wsHub.BroadcastToRole("cashier", "PAYMENT_VERIFICATION_PENDING", map[string]interface{}{
		"order_id":     order.ID.String(),
		"table_number": order.TableNumber,
		"method":       order.PaymentMethod,
		"total":        order.Total,
		"status":       order.Status,
		"action":       "resubmitted", // Indica que es un reenvío o nuevo envío
		"order":        order,         // Incluir la orden completa para el frontend
	})
	log.Printf("📡 [Backend] Notificación 'PAYMENT_VERIFICATION_PENDING' enviada a cajeros para orden %s", orderID.String())

	return order, nil
}
