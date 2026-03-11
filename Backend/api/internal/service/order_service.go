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
	CreateOrder(waiterID uuid.UUID, tableNumber int, orderType string, customerName, deliveryAddress, deliveryPhone, deliveryNotes *string, items []domain.OrderItem) (*domain.Order, error)
	GetOrders(userRole string, userID uuid.UUID, status string, myOrders string) ([]domain.Order, error)
	GetOrderByID(orderID uuid.UUID) (*domain.Order, error)
	UpdateOrderStatus(orderID, userID uuid.UUID, newStatus string) (*domain.Order, error)
	UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem) (*domain.Order, error)
	ManageOrderAsAdmin(orderID uuid.UUID, status *string, newWaiterID *uuid.UUID) (*domain.Order, error)
	AddPaymentProof(orderID uuid.UUID, method string, proofPath string) (*domain.Order, error)
	EditOrder(orderID, userID uuid.UUID, editRequest domain.EditOrderRequest) (*domain.Order, error)
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

func (s *orderService) CreateOrder(waiterID uuid.UUID, tableNumber int, orderType string, customerName, deliveryAddress, deliveryPhone, deliveryNotes *string, items []domain.OrderItem) (*domain.Order, error) {
	if len(items) == 0 {
		return nil, errors.New("la orden no puede estar vacía")
	}

	// 1. Validar order_type
	if orderType == "" {
		orderType = "mesa" // Default
	}
	if orderType != "mesa" && orderType != "llevar" && orderType != "domicilio" {
		return nil, errors.New("order_type inválido. Debe ser: mesa, llevar o domicilio")
	}

	// 2. Validar customer_name para llevar y domicilio
	if (orderType == "llevar" || orderType == "domicilio") {
		if customerName == nil || *customerName == "" {
			return nil, errors.New("customer_name es obligatorio para órdenes de tipo llevar o domicilio")
		}
	}

	// 3. Validar campos obligatorios para domicilio
	if orderType == "domicilio" {
		if deliveryAddress == nil || *deliveryAddress == "" {
			return nil, errors.New("delivery_address es obligatorio para órdenes a domicilio")
		}
		if deliveryPhone == nil || *deliveryPhone == "" {
			return nil, errors.New("delivery_phone es obligatorio para órdenes a domicilio")
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
		table, err = s.tableRepo.GetByNumber(tableNumber)
		if err != nil {
			return nil, errors.New("la mesa seleccionada no es válida o no está activa")
		}
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
		// Ejecutamos en una Goroutine para no bloquear la respuesta del API
		go func(orderID uuid.UUID) {
			log.Printf("🖨️ Iniciando flujo de impresión para Orden: %s", orderID)
			_, printErr := s.kitchenTicketService.PrintOrderAllDestinations(orderID)
			if printErr != nil {
				log.Printf("❌ Error en PrintOrderAllDestinations: %v", printErr)
			} else {
				log.Printf("✅ Impresión enviada con éxito (Estaciones + Caja) para Orden: %s", orderID)
			}
		}(createdOrder.ID)
	}
	// =================================================================

	// Notificar vía WebSockets
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

// EditOrder permite editar una orden de forma granular (agregar, modificar, eliminar items y cambiar metadatos)
func (s *orderService) EditOrder(orderID, userID uuid.UUID, editRequest domain.EditOrderRequest) (*domain.Order, error) {
	log.Printf("✏️ [Service] Editando orden %s por usuario %s", orderID.String(), userID.String())

	// 1. Obtener la orden actual
	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return nil, errors.New("orden no encontrada")
	}

	// 2. Validar que la orden esté en un estado editable
	editableStates := []string{"pendiente_aprobacion", "rechazado"}
	if !contains(editableStates, order.Status) {
		return nil, errors.New("la orden solo puede editarse cuando está en estado 'pendiente_aprobacion' o 'rechazado'. Estado actual: " + order.Status)
	}

	// 3. Validar permisos: solo el mesero que creó la orden o un admin pueden editarla
	// (Este check se puede hacer en el handler si ya tienes el rol)

	// 4. Copiar items actuales para aplicar operaciones
	currentItems := make([]domain.OrderItem, len(order.Items))
	copy(currentItems, order.Items)

	// 5. Aplicar operaciones de ELIMINACIÓN (de mayor a menor índice para evitar problemas)
	if len(editRequest.RemoveItems) > 0 {
		// Ordenar índices de mayor a menor
		indices := make([]int, len(editRequest.RemoveItems))
		copy(indices, editRequest.RemoveItems)
		for i := 0; i < len(indices); i++ {
			for j := i + 1; j < len(indices); j++ {
				if indices[i] < indices[j] {
					indices[i], indices[j] = indices[j], indices[i]
				}
			}
		}

		// Eliminar de mayor a menor
		for _, idx := range indices {
			if idx < 0 || idx >= len(currentItems) {
				return nil, errors.New("índice de item a eliminar fuera de rango")
			}
			currentItems = append(currentItems[:idx], currentItems[idx+1:]...)
		}
	}

	// 6. Aplicar operaciones de ACTUALIZACIÓN
	for _, updateOp := range editRequest.UpdateItems {
		if updateOp.Index < 0 || updateOp.Index >= len(currentItems) {
			return nil, errors.New("índice de item a actualizar fuera de rango")
		}

		item := &currentItems[updateOp.Index]

		// Actualizar cantidad si se especifica
		if updateOp.Quantity != nil {
			if *updateOp.Quantity <= 0 {
				return nil, errors.New("la cantidad debe ser mayor a 0")
			}
			item.Quantity = *updateOp.Quantity
		}

		// Actualizar notas si se especifica
		if updateOp.Notes != nil {
			item.Notes = updateOp.Notes
		}

		// Actualizar is_takeout si se especifica
		if updateOp.IsTakeout != nil {
			item.IsTakeout = *updateOp.IsTakeout
		}

		// Actualizar customizaciones si se especifica
		if updateOp.CustomizationsInput != nil {
			// Obtener todos los ingredientes y acompañantes del menu item
			allIngredients, allAccompaniments, err := s.menuRepo.GetMenuItemDetails(item.MenuItemID)
			if err != nil {
				log.Printf("⚠️ Error obteniendo detalles del menu item %s: %v", item.MenuItemID, err)
				allIngredients = []domain.Ingredient{}
				allAccompaniments = []domain.Accompaniment{}
			}

			// Crear mapas para búsqueda rápida de IDs removidos/no seleccionados
			removedIngredientsMap := make(map[uuid.UUID]bool)
			for _, id := range updateOp.CustomizationsInput.RemovedIngredientIDs {
				removedIngredientsMap[id] = true
			}

			unselectedAccompanimentsMap := make(map[uuid.UUID]bool)
			for _, id := range updateOp.CustomizationsInput.UnselectedAccompanimentIDs {
				unselectedAccompanimentsMap[id] = true
			}

			// Filtrar ingredientes ACTIVOS
			activeIngredients := []domain.Ingredient{}
			for _, ingredient := range allIngredients {
				if !removedIngredientsMap[ingredient.ID] {
					activeIngredients = append(activeIngredients, ingredient)
				}
			}

			// Filtrar acompañamientos SELECCIONADOS
			selectedAccompaniments := []domain.Accompaniment{}
			for _, accompaniment := range allAccompaniments {
				if !unselectedAccompanimentsMap[accompaniment.ID] {
					selectedAccompaniments = append(selectedAccompaniments, accompaniment)
				}
			}

			// Actualizar customizaciones del item
			item.Customizations = domain.Customizations{
				ActiveIngredients:      activeIngredients,
				SelectedAccompaniments: selectedAccompaniments,
			}
		}
	}

	// 7. Aplicar operaciones de ADICIÓN
	for _, newItem := range editRequest.AddItems {
		// Validar que el item tenga datos mínimos
		if newItem.MenuItemID == uuid.Nil {
			return nil, errors.New("menu_item_id es requerido para items nuevos")
		}
		if newItem.Quantity <= 0 {
			return nil, errors.New("la cantidad debe ser mayor a 0")
		}
		if newItem.PriceAtOrder <= 0 {
			return nil, errors.New("price_at_order debe ser mayor a 0")
		}

		// Procesar customizaciones del nuevo item
		if newItem.CustomizationsInput != nil {
			allIngredients, allAccompaniments, err := s.menuRepo.GetMenuItemDetails(newItem.MenuItemID)
			if err != nil {
				log.Printf("⚠️ Error obteniendo detalles del menu item %s: %v", newItem.MenuItemID, err)
				allIngredients = []domain.Ingredient{}
				allAccompaniments = []domain.Accompaniment{}
			}

			removedIngredientsMap := make(map[uuid.UUID]bool)
			for _, id := range newItem.CustomizationsInput.RemovedIngredientIDs {
				removedIngredientsMap[id] = true
			}

			unselectedAccompanimentsMap := make(map[uuid.UUID]bool)
			for _, id := range newItem.CustomizationsInput.UnselectedAccompanimentIDs {
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

			newItem.Customizations = domain.Customizations{
				ActiveIngredients:      activeIngredients,
				SelectedAccompaniments: selectedAccompaniments,
			}
		}

		currentItems = append(currentItems, newItem)
	}

	// 8. Validar que la orden tenga al menos un item
	if len(currentItems) == 0 {
		return nil, errors.New("la orden debe tener al menos un item")
	}

	// 9. Aplicar cambios a metadatos de la orden si se especificaron
	orderUpdates := make(map[string]interface{})

	if editRequest.OrderType != nil {
		if *editRequest.OrderType != "mesa" && *editRequest.OrderType != "llevar" && *editRequest.OrderType != "domicilio" {
			return nil, errors.New("order_type inválido. Debe ser: mesa, llevar o domicilio")
		}
		orderUpdates["order_type"] = *editRequest.OrderType
		
		// Si cambia a domicilio, validar campos obligatorios
		if *editRequest.OrderType == "domicilio" {
			if editRequest.DeliveryAddress == nil && order.DeliveryAddress == nil {
				return nil, errors.New("delivery_address es obligatorio para órdenes a domicilio")
			}
			if editRequest.DeliveryPhone == nil && order.DeliveryPhone == nil {
				return nil, errors.New("delivery_phone es obligatorio para órdenes a domicilio")
			}
		}

		// Si cambia a llevar o domicilio, forzar todos los items a is_takeout = true
		if *editRequest.OrderType == "llevar" || *editRequest.OrderType == "domicilio" {
			for i := range currentItems {
				currentItems[i].IsTakeout = true
			}
		}
	}

	if editRequest.DeliveryAddress != nil {
		orderUpdates["delivery_address"] = *editRequest.DeliveryAddress
	}

	if editRequest.DeliveryPhone != nil {
		orderUpdates["delivery_phone"] = *editRequest.DeliveryPhone
	}

	if editRequest.DeliveryNotes != nil {
		orderUpdates["delivery_notes"] = *editRequest.DeliveryNotes
	}

	if editRequest.TableNumber != nil {
		// Validar que la mesa exista
		table, err := s.tableRepo.GetByNumber(*editRequest.TableNumber)
		if err != nil {
			return nil, errors.New("la mesa especificada no existe o no está activa")
		}
		orderUpdates["table_id"] = table.ID
		orderUpdates["table_number"] = table.TableNumber
	}

	// Si la orden estaba rechazada, cambiarla a pendiente_aprobacion
	if order.Status == "rechazado" {
		orderUpdates["status"] = "pendiente_aprobacion"
	}

	// 10. Calcular nuevo total
	var newTotal float64
	for _, item := range currentItems {
		newTotal += item.PriceAtOrder * float64(item.Quantity)
	}
	orderUpdates["total"] = newTotal

	// 11. Guardar cambios en la base de datos
	err = s.orderRepo.EditOrder(orderID, currentItems, orderUpdates)
	if err != nil {
		log.Printf("❌ [Service] Error guardando cambios en orden: %v", err)
		return nil, err
	}

	// 12. Obtener la orden actualizada
	updatedOrder, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return nil, err
	}

	// 13. Notificar cambios por WebSocket
	s.wsHub.BroadcastMessage("ORDER_EDITED", updatedOrder)
	log.Printf("📡 [Service] Evento 'ORDER_EDITED' emitido para orden %s", orderID.String())

	// Si la orden fue corregida y pasó a pendiente de aprobación, notificar
	if order.Status == "rechazado" && updatedOrder.Status == "pendiente_aprobacion" {
		s.wsHub.BroadcastMessage("ORDER_RESUBMITTED", updatedOrder)
		log.Printf("📡 [Service] Evento 'ORDER_RESUBMITTED' emitido para orden %s", orderID.String())
	}

	return updatedOrder, nil
}

// contains es una función auxiliar para verificar si un string está en un slice
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

