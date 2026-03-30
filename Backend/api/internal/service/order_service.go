// =================================================================
// ARCHIVO 2: /internal/service/order_service.go (FINAL)
// =================================================================
package service

import (
	"errors"
	"log"
	"sort"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

type OrderService interface {
	CreateOrder(waiterID uuid.UUID, tableNumber int, orderType string, customerName, deliveryAddress, deliveryPhone, deliveryNotes *string, items []domain.OrderItem, parentOrderID *uuid.UUID) (*domain.Order, error)
	GetOrders(userRole string, userID uuid.UUID, status string, myOrders string, teamOrders string) ([]domain.Order, error)
	GetOrderByID(orderID uuid.UUID) (*domain.Order, error)
	EditOrder(orderID, userID uuid.UUID, editReq domain.EditOrderRequest) (*domain.Order, error)
	LinkOrderToParent(orderID, parentOrderID uuid.UUID) (*domain.Order, error)
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
kitchenTicketService *KitchenTicketService
}

func NewOrderService(
	orderRepo repository.OrderRepository,
	tableRepo repository.TableRepository,
	menuRepo repository.MenuRepository,
	ingredientRepo repository.IngredientRepository,
	accompanimentRepo repository.AccompanimentRepository,
	wsHub *wshub.Hub,
	bc BlockchainService,
	kitchenTicketService *KitchenTicketService,
) OrderService {
	return &orderService{
		 orderRepo:         orderRepo,
		 tableRepo:         tableRepo,
		 menuRepo:          menuRepo,
		 ingredientRepo:    ingredientRepo,
		 accompanimentRepo: accompanimentRepo,
		 wsHub:             wsHub,
		 blockchain:        bc,
		 kitchenTicketService: kitchenTicketService,
	}
}

func (s *orderService) CreateOrder(waiterID uuid.UUID, tableNumber int, orderType string, customerName, deliveryAddress, deliveryPhone, deliveryNotes *string, items []domain.OrderItem, parentOrderID *uuid.UUID) (*domain.Order, error) {
	if len(items) == 0 {
		return nil, errors.New("la orden no puede estar vacía")
	}

	var parentOrder *domain.Order
	if parentOrderID != nil {
		var err error
		parentOrder, err = s.orderRepo.GetOrderByID(*parentOrderID)
		if err != nil {
			return nil, errors.New("la orden padre no existe")
		}
	}

	// 1. Validar order_type
	if orderType == "" {
		orderType = "mesa" // Default
	}
	if orderType != "mesa" && orderType != "llevar" && orderType != "domicilio" {
		return nil, errors.New("order_type inválido. Debe ser: mesa, llevar o domicilio")
	}
	if parentOrder != nil && parentOrder.OrderType != orderType {
		return nil, errors.New("la orden adicional debe tener el mismo order_type que la orden padre")
	}

	// 2. Validar campos obligatorios para domicilio
	if orderType == "domicilio" {
		if customerName == nil || *customerName == "" {
			return nil, errors.New("customer_name es obligatorio para órdenes a domicilio")
		}
		if deliveryAddress == nil || *deliveryAddress == "" {
			return nil, errors.New("delivery_address es obligatorio para órdenes a domicilio")
		}
		if deliveryPhone == nil || *deliveryPhone == "" {
			return nil, errors.New("delivery_phone es obligatorio para órdenes a domicilio")
		}
	} else if orderType == "llevar" {
		if customerName == nil || *customerName == "" {
			return nil, errors.New("customer_name es obligatorio para órdenes para llevar")
		}
	}

	// 3. Determinar mesa según tipo de orden (Manejo de mesas virtuales)
	var table *domain.Table
	var err error

	if orderType == "domicilio" {
		table, err = s.tableRepo.GetByNumber(9998)
		if err != nil {
			return nil, errors.New("mesa virtual para domicilios no está configurada")
		}
	} else if orderType == "llevar" {
		table, err = s.tableRepo.GetByNumber(9999)
		if err != nil {
			return nil, errors.New("mesa virtual para llevar no está configurada")
		}
	} else {
		if parentOrder != nil {
			tableNumber = parentOrder.TableNumber
		}
		table, err = s.tableRepo.GetByNumber(tableNumber)
		if err != nil {
			return nil, errors.New("la mesa seleccionada no es válida o no está activa")
		}
	}

	if parentOrder != nil && parentOrder.TableNumber != table.TableNumber {
		return nil, errors.New("la orden adicional debe estar asociada a la misma mesa que la orden padre")
	}

	// 4. Forzar is_takeout y procesar customizaciones
	for i := range items {
		if orderType == "llevar" || orderType == "domicilio" {
			items[i].IsTakeout = true
		}

		// Obtener detalles para inyectar ingredientes/acompañantes
		allIngredients, allAccompaniments, err := s.menuRepo.GetMenuItemDetails(items[i].MenuItemID)
		if err != nil {
			log.Printf("⚠️ Error detalles menu item %s: %v", items[i].MenuItemID, err)
			allIngredients = []domain.Ingredient{}
			allAccompaniments = []domain.Accompaniment{}
		}

		if items[i].CustomizationsInput != nil {
			removedIngredientsMap := make(map[uuid.UUID]bool)
			for _, id := range items[i].CustomizationsInput.RemovedIngredientIDs {
				removedIngredientsMap[id] = true
			}

			unselectedAccompanimentsMap := make(map[uuid.UUID]bool)
			for _, id := range items[i].CustomizationsInput.UnselectedAccompanimentIDs {
				unselectedAccompanimentsMap[id] = true
			}

			activeIngredients := []domain.Ingredient{}
			for _, ingredient := range allIngredients {
				if !removedIngredientsMap[ingredient.ID] {
					activeIngredients = append(activeIngredients, ingredient)
				}
			}

			selectedAccompaniments := []domain.Accompaniment{}
			for _, accompaniment := range allAccompaniments {
				if !unselectedAccompanimentsMap[accompaniment.ID] {
					selectedAccompaniments = append(selectedAccompaniments, accompaniment)
				}
			}

			items[i].Customizations = domain.Customizations{
				ActiveIngredients:      activeIngredients,
				SelectedAccompaniments: selectedAccompaniments,
			}
		} else {
			items[i].Customizations = domain.Customizations{
				ActiveIngredients:      allIngredients,
				SelectedAccompaniments: allAccompaniments,
			}
		}
	}

	// 5. Calcular total y persistir orden
	var total float64
	for _, item := range items {
		total += item.PriceAtOrder * float64(item.Quantity)
	}

	order := &domain.Order{
		ParentOrderID:  parentOrderID,
		WaiterID:        waiterID,
		TableID:         table.ID,
		TableNumber:     table.TableNumber,
		Status:          "pendiente_aprobacion",
		Total:           total,
		Items:           items,
		OrderType:       orderType,
		CustomerName:    customerName,
		DeliveryAddress: deliveryAddress,
		DeliveryPhone:   deliveryPhone,
		DeliveryNotes:   deliveryNotes,
	}

	createdOrder, err := s.orderRepo.CreateOrder(order)
	if err != nil {
		return nil, err
	}

	// =================================================================
	// INTEGRACIÓN DE IMPRESIÓN (MODIFICADO)
	// =================================================================
	if s.kitchenTicketService != nil {
		if enqueueErr := s.kitchenTicketService.EnqueueOrderPrint(createdOrder.ID); enqueueErr != nil {
			log.Printf("❌ Error encolando impresión para orden %s: %v", createdOrder.ID, enqueueErr)
		}
	}
	// =================================================================

	// Notificar vía WebSockets
	s.wsHub.BroadcastMessage("NEW_PENDING_ORDER", createdOrder)
	
	return createdOrder, nil
}

func (s *orderService) LinkOrderToParent(orderID, parentOrderID uuid.UUID) (*domain.Order, error) {
	if orderID == parentOrderID {
		return nil, errors.New("la orden no puede enlazarse consigo misma")
	}

	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return nil, errors.New("la orden hija no existe")
	}

	parentOrder, err := s.orderRepo.GetOrderByID(parentOrderID)
	if err != nil {
		return nil, errors.New("la orden padre no existe")
	}

	if order.TableNumber != parentOrder.TableNumber {
		return nil, errors.New("solo se pueden enlazar órdenes de la misma mesa")
	}

	if order.OrderType != parentOrder.OrderType {
		return nil, errors.New("solo se pueden enlazar órdenes con el mismo order_type")
	}

	linkedOrder, err := s.orderRepo.LinkOrderToParent(orderID, parentOrderID)
	if err != nil {
		return nil, err
	}

	s.wsHub.BroadcastMessage("ORDER_UPDATED", linkedOrder)
	return linkedOrder, nil
}

func (s *orderService) GetOrders(userRole string, userID uuid.UUID, status string, myOrders string, teamOrders string) ([]domain.Order, error) {
	filters := make(map[string]interface{})
	if status != "" {
		filters["status"] = status
	}

	// Si my_orders=true, filtrar por waiter_id independientemente del rol
	if myOrders == "true" {
		filters["waiter_id"] = userID
	} else if userRole == "mesero" && teamOrders == "true" {
		// team_orders permite a meseros ver órdenes del equipo (sin filtrar por waiter)
	} else if userRole == "mesero" {
		// Si es mesero y no se especifica my_orders, filtrar por defecto
		filters["waiter_id"] = userID
	}

	return s.orderRepo.GetOrders(filters)
}

func (s *orderService) GetOrderByID(orderID uuid.UUID) (*domain.Order, error) {
	return s.orderRepo.GetOrderByID(orderID)
}

func (s *orderService) EditOrder(orderID, userID uuid.UUID, editReq domain.EditOrderRequest) (*domain.Order, error) {
	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return nil, errors.New("orden no encontrada")
	}

	if order.WaiterID != userID {
		return nil, errors.New("no tienes permisos para editar esta orden")
	}

	if order.Status != "pendiente_aprobacion" && order.Status != "rechazado" {
		return nil, errors.New("solo se pueden editar órdenes en estado pendiente_aprobacion o rechazado")
	}

	items := make([]domain.OrderItem, len(order.Items))
	copy(items, order.Items)

	if len(editReq.RemoveItems) > 0 {
		sort.Slice(editReq.RemoveItems, func(i, j int) bool {
			return editReq.RemoveItems[i] > editReq.RemoveItems[j]
		})

		for _, idx := range editReq.RemoveItems {
			if idx < 0 || idx >= len(items) {
				return nil, errors.New("índice inválido en remove_items")
			}
			items = append(items[:idx], items[idx+1:]...)
		}
	}

	for _, op := range editReq.UpdateItems {
		if op.Index < 0 || op.Index >= len(items) {
			return nil, errors.New("índice inválido en update_items")
		}

		if op.Quantity != nil {
			if *op.Quantity <= 0 {
				return nil, errors.New("la cantidad debe ser mayor a 0")
			}
			items[op.Index].Quantity = *op.Quantity
		}

		if op.Notes != nil {
			items[op.Index].Notes = op.Notes
		}

		if op.IsTakeout != nil {
			items[op.Index].IsTakeout = *op.IsTakeout
		}
	}

	for _, addItem := range editReq.AddItems {
		if addItem.Quantity <= 0 {
			return nil, errors.New("todos los ítems agregados deben tener cantidad mayor a 0")
		}
		items = append(items, addItem)
	}

	if len(items) == 0 {
		return nil, errors.New("la orden no puede quedar vacía")
	}

	if order.OrderType == "llevar" || order.OrderType == "domicilio" {
		for i := range items {
			items[i].IsTakeout = true
		}
	}

	return s.UpdateOrderItems(orderID, items)
}

func (s *orderService) UpdateOrderStatus(orderID, userID uuid.UUID, newStatus string) (*domain.Order, error) {
	log.Printf("📊 [Service] Actualizando orden %s a estado '%s'", orderID.String(), newStatus)

	updatedOrder, err := s.orderRepo.UpdateOrderStatus(orderID, userID, newStatus)
	if err != nil {
		log.Printf("❌ [Service] Error actualizando estado: %v", err)
		return nil, err
	}

	// --- INCREMENTAR ORDER_COUNT CUANDO SE APRUEBA LA ORDEN ---
	if newStatus == "aprobado" {
		// Obtener la orden completa con sus items
		fullOrder, err := s.orderRepo.GetOrderByID(orderID)
		if err != nil {
			log.Printf("⚠️ No se pudo obtener la orden completa para incrementar contadores: %v", err)
		} else {
			// Incrementar el contador de cada item en la orden
			go func(ord *domain.Order) {
				for _, item := range ord.Items {
					for i := 0; i < item.Quantity; i++ {
						if err := s.menuRepo.IncrementOrderCount(item.MenuItemID); err != nil {
							log.Printf("⚠️ Error incrementando contador para item %s: %v", item.MenuItemID, err)
						}
					}
				}
				log.Printf("✅ Contadores de popularidad actualizados para orden %s", ord.ID)
			}(fullOrder)
		}
	}
	// ----------------------------------------------------------

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
		s.wsHub.BroadcastToRole("cajero", "PAYMENT_VERIFICATION_PENDING", map[string]interface{}{
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
		s.wsHub.BroadcastToRole("cajero", "ORDER_READY_FOR_PAYMENT", map[string]interface{}{
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
	s.wsHub.BroadcastToRole("cajero", "PAYMENT_VERIFICATION_PENDING", map[string]interface{}{
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
