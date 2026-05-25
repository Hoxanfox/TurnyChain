// =================================================================
// ARCHIVO 3: /internal/handler/order_handler.go (FINAL)
// =================================================================
package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type OrderHandler struct {
	orderService        service.OrderService
	createOrderMu       sync.Mutex
	recentCreateByKey   map[string]recentCreatedOrder
	inFlightCreateByKey map[string]struct{}
}

type recentCreatedOrder struct {
	orderID   uuid.UUID
	expiresAt time.Time
}

func NewOrderHandler(s service.OrderService) *OrderHandler {
	return &OrderHandler{
		orderService:        s,
		recentCreateByKey:   make(map[string]recentCreatedOrder),
		inFlightCreateByKey: make(map[string]struct{}),
	}
}

type CreateOrderPayload struct {
	TableNumber     int                `json:"table_number"`
	ParentOrderID   *uuid.UUID         `json:"parent_order_id,omitempty"`
	OrderType       string             `json:"order_type"`       // "mesa", "llevar", "domicilio"
	CustomerName    *string            `json:"customer_name"`    // Requerido si order_type = "llevar" o "domicilio"
	DeliveryAddress *string            `json:"delivery_address"` // Requerido si order_type = "domicilio"
	DeliveryPhone   *string            `json:"delivery_phone"`   // Requerido si order_type = "domicilio"
	DeliveryNotes   *string            `json:"delivery_notes"`   // Opcional
	Items           []domain.OrderItem `json:"items"`
}

func (h *OrderHandler) buildCreateFingerprint(waiterID uuid.UUID, paymentMethod string, payload CreateOrderPayload) string {
	fingerprintPayload := struct {
		WaiterID      string             `json:"waiter_id"`
		PaymentMethod string             `json:"payment_method"`
		Payload       CreateOrderPayload `json:"payload"`
	}{
		WaiterID:      waiterID.String(),
		PaymentMethod: paymentMethod,
		Payload:       payload,
	}

	data, err := json.Marshal(fingerprintPayload)
	if err != nil {
		return ""
	}

	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func (h *OrderHandler) cleanupExpiredCreateEntriesLocked(now time.Time) {
	for key, entry := range h.recentCreateByKey {
		if now.After(entry.expiresAt) {
			delete(h.recentCreateByKey, key)
		}
	}
}

func (h *OrderHandler) tryAcquireCreateKey(key string) (existingOrderID *uuid.UUID, canProceed bool, waiting bool) {
	h.createOrderMu.Lock()
	defer h.createOrderMu.Unlock()

	now := time.Now()
	h.cleanupExpiredCreateEntriesLocked(now)

	if key == "" {
		return nil, true, false
	}

	if existing, ok := h.recentCreateByKey[key]; ok && now.Before(existing.expiresAt) {
		id := existing.orderID
		return &id, false, false
	}

	if _, ok := h.inFlightCreateByKey[key]; ok {
		return nil, false, true
	}

	h.inFlightCreateByKey[key] = struct{}{}
	return nil, true, false
}

func (h *OrderHandler) releaseCreateKey(key string) {
	if key == "" {
		return
	}

	h.createOrderMu.Lock()
	defer h.createOrderMu.Unlock()
	delete(h.inFlightCreateByKey, key)
}

func (h *OrderHandler) markCreateCompleted(key string, orderID uuid.UUID) {
	if key == "" {
		return
	}

	h.createOrderMu.Lock()
	defer h.createOrderMu.Unlock()

	delete(h.inFlightCreateByKey, key)
	h.recentCreateByKey[key] = recentCreatedOrder{
		orderID:   orderID,
		expiresAt: time.Now().Add(15 * time.Second),
	}
}

func (h *OrderHandler) resolveExistingOrAcquire(key string) (*uuid.UUID, bool) {
	if key == "" {
		return nil, true
	}

	deadline := time.Now().Add(3 * time.Second)
	for {
		existingID, canProceed, waiting := h.tryAcquireCreateKey(key)
		if existingID != nil {
			return existingID, false
		}
		if canProceed {
			return nil, true
		}
		if !waiting {
			return nil, false
		}
		if time.Now().After(deadline) {
			return nil, false
		}
		time.Sleep(75 * time.Millisecond)
	}
}

func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
	payload := new(CreateOrderPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	waiterID, _ := uuid.Parse(c.Locals("user_id").(string))
	requestID := c.Get("X-Request-ID")
	log.Printf("[CreateOrder] request_id=%s waiter_id=%s table=%d items=%d", requestID, waiterID.String(), payload.TableNumber, len(payload.Items))

	createKey := h.buildCreateFingerprint(waiterID, "", *payload)
	existingID, canProceed := h.resolveExistingOrAcquire(createKey)
	if existingID != nil {
		existingOrder, err := h.orderService.GetOrderByID(*existingID)
		if err == nil {
			log.Printf("[CreateOrder] request_id=%s duplicate_resolved existing_order_id=%s", requestID, existingOrder.ID.String())
			return c.Status(fiber.StatusOK).JSON(existingOrder)
		}
	}
	if !canProceed {
		log.Printf("[CreateOrder] request_id=%s duplicate_in_progress", requestID)
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "duplicate order request in progress"})
	}
	defer h.releaseCreateKey(createKey)

	order, err := h.orderService.CreateOrder(waiterID, payload.TableNumber, payload.OrderType, payload.CustomerName, payload.DeliveryAddress, payload.DeliveryPhone, payload.DeliveryNotes, payload.Items, payload.ParentOrderID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	h.markCreateCompleted(createKey, order.ID)
	log.Printf("[CreateOrder] request_id=%s created_order_id=%s", requestID, order.ID.String())
	return c.Status(fiber.StatusCreated).JSON(order)
}

func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	userRole := c.Locals("user_role").(string)
	status := c.Query("status")
	myOrders := c.Query("my_orders") // Nuevo parámetro
	teamOrders := c.Query("team_orders")
	fromParam := c.Query("from")
	toParam := c.Query("to")
	var createdAfter *time.Time
	var createdBefore *time.Time
	if fromParam != "" {
		parsed, err := time.Parse(time.RFC3339, fromParam)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid from date, use RFC3339"})
		}
		createdAfter = &parsed
	}
	if toParam != "" {
		parsed, err := time.Parse(time.RFC3339, toParam)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid to date, use RFC3339"})
		}
		createdBefore = &parsed
	}

	log.Printf("📥 [GetOrders] Request - UserID: %s, Role: %s, Status: %s, MyOrders: %s, TeamOrders: %s", userID, userRole, status, myOrders, teamOrders)

	orders, err := h.orderService.GetOrders(userRole, userID, status, myOrders, teamOrders, createdAfter, createdBefore)
	if err != nil {
		log.Printf("❌ [GetOrders] Error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not retrieve orders", "details": err.Error()})
	}

	log.Printf("✅ [GetOrders] Returning %d orders", len(orders))
	return c.JSON(orders)
}

func (h *OrderHandler) GetOrdersToday(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	userRole := c.Locals("user_role").(string)
	status := c.Query("status")
	myOrders := c.Query("my_orders")
	teamOrders := c.Query("team_orders")

	location := time.Now().Location()
	now := time.Now().In(location)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	endOfDay := startOfDay.Add(24 * time.Hour)

	log.Printf("📥 [GetOrdersToday] Request - UserID: %s, Role: %s, Status: %s, MyOrders: %s, TeamOrders: %s", userID, userRole, status, myOrders, teamOrders)

	orders, err := h.orderService.GetOrders(userRole, userID, status, myOrders, teamOrders, &startOfDay, &endOfDay)
	if err != nil {
		log.Printf("❌ [GetOrdersToday] Error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not retrieve orders", "details": err.Error()})
	}

	log.Printf("✅ [GetOrdersToday] Returning %d orders", len(orders))
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

// UploadPaymentProof maneja subida de imagenes de comprobante y actualiza la orden.
// Espera multipart/form-data con campos: file (archivo), method (transferencia|efectivo)
func (h *OrderHandler) UploadPaymentProof(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	// Obtener información del usuario desde el token
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	log.Printf("📤 [Handler] Recibiendo comprobante para orden %s", orderID.String())
	log.Printf("   - Usuario: %s (Role: %s)", userID, userRole)

	// Parsear método
	method := c.FormValue("method")
	if method == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment method is required"})
	}

	log.Printf("   - Método de pago: %s", method)

	proofPath := ""
	savedFilePath := ""
	file, fileErr := c.FormFile("file")
	if fileErr != nil {
		if method != "efectivo" {
			log.Printf("❌ [Handler] Error al obtener archivo: %v", fileErr)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file is required for transferencia"})
		}
		log.Printf("ℹ️ [Handler] Pago en efectivo sin archivo adjunto para orden %s", orderID.String())
	} else {
		log.Printf("   - Archivo recibido: %s (%d bytes)", file.Filename, file.Size)

		// Crear carpeta ./uploads/proofs si no existe
		uploadDir := "./uploads/proofs"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not create upload directory"})
		}

		// Guardar archivo con nombre orden_<id>_<timestamp>_<original>
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("order_%s_%d%s", orderID.String(), time.Now().Unix(), ext)
		destination := filepath.Join(uploadDir, filename)

		if err := c.SaveFile(file, destination); err != nil {
			log.Printf("❌ [Handler] Error al guardar archivo: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not save file"})
		}

		log.Printf("💾 [Handler] Archivo guardado en: %s", destination)
		savedFilePath = destination
		proofPath = "/static/proofs/" + filename
	}

	order, err := h.orderService.AddPaymentProof(orderID, method, proofPath)
	if err != nil {
		// Intentar limpiar el archivo si DB falla
		if savedFilePath != "" {
			_ = os.Remove(savedFilePath)
		}
		log.Printf("❌ [Handler] Error al actualizar orden: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not update order with proof"})
	}

	log.Printf("✅ [Handler] Comprobante procesado exitosamente para orden %s", orderID.String())

	return c.JSON(order)
}

// CreateOrderWithPayment maneja la creación de una orden con datos de pago y comprobante adjunto.
// Espera multipart/form-data con:
// - order_data: JSON string con {table_number, items}
// - payment_method: 'efectivo' | 'transferencia'
// - payment_proof: File (opcional, requerido para transferencia)
func (h *OrderHandler) CreateOrderWithPayment(c *fiber.Ctx) error {
	// 1. Obtener el user_id del token
	waiterID, _ := uuid.Parse(c.Locals("user_id").(string))
	requestID := c.Get("X-Request-ID")

	// 2. Parsear order_data (JSON string)
	orderDataStr := c.FormValue("order_data")
	if orderDataStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "order_data is required"})
	}

	var payload CreateOrderPayload
	if err := json.Unmarshal([]byte(orderDataStr), &payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order_data JSON"})
	}

	// 3. Obtener payment_method
	paymentMethod := c.FormValue("payment_method")
	if paymentMethod == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_method is required"})
	}
	if paymentMethod != "efectivo" && paymentMethod != "transferencia" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_method must be 'efectivo' or 'transferencia'"})
	}
	log.Printf("[CreateOrderWithPayment] request_id=%s waiter_id=%s table=%d items=%d payment_method=%s", requestID, waiterID.String(), payload.TableNumber, len(payload.Items), paymentMethod)

	createKey := h.buildCreateFingerprint(waiterID, paymentMethod, payload)
	existingID, canProceed := h.resolveExistingOrAcquire(createKey)
	if existingID != nil {
		existingOrder, err := h.orderService.GetOrderByID(*existingID)
		if err == nil {
			log.Printf("[CreateOrderWithPayment] request_id=%s duplicate_resolved existing_order_id=%s", requestID, existingOrder.ID.String())
			return c.Status(fiber.StatusOK).JSON(existingOrder)
		}
	}
	if !canProceed {
		log.Printf("[CreateOrderWithPayment] request_id=%s duplicate_in_progress", requestID)
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "duplicate order request in progress"})
	}
	defer h.releaseCreateKey(createKey)

	// 4. Crear la orden primero
	order, err := h.orderService.CreateOrder(waiterID, payload.TableNumber, payload.OrderType, payload.CustomerName, payload.DeliveryAddress, payload.DeliveryPhone, payload.DeliveryNotes, payload.Items, payload.ParentOrderID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// 5. Manejar el archivo si es transferencia
	var proofPath string
	if paymentMethod == "transferencia" {
		file, err := c.FormFile("payment_proof")
		if err != nil {
			// Si es transferencia, el archivo es requerido
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_proof is required for 'transferencia'"})
		}

		// Validar que sea una imagen
		contentType := file.Header.Get("Content-Type")
		if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/jpg" && contentType != "image/webp" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_proof must be an image file"})
		}

		// Validar tamaño (5MB)
		if file.Size > 5*1024*1024 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_proof must be less than 5MB"})
		}

		// Crear carpeta ./uploads/proofs si no existe
		uploadDir := "./uploads/proofs"
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not create upload directory"})
		}

		// Guardar archivo con nombre orden_<id>_<timestamp>_<original>
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("order_%s_%d%s", order.ID.String(), time.Now().Unix(), ext)
		destination := filepath.Join(uploadDir, filename)

		if err := c.SaveFile(file, destination); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not save file"})
		}

		proofPath = "/static/proofs/" + filename
	}

	// 6. Actualizar la orden con los datos de pago
	updatedOrder, err := h.orderService.AddPaymentProof(order.ID, paymentMethod, proofPath)
	if err != nil {
		// Si falla, intentar limpiar el archivo
		if proofPath != "" {
			_ = os.Remove("./uploads" + proofPath[len("/static"):])
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "could not update order with payment data"})
	}
	h.markCreateCompleted(createKey, updatedOrder.ID)
	log.Printf("[CreateOrderWithPayment] request_id=%s created_order_id=%s", requestID, updatedOrder.ID.String())

	return c.Status(fiber.StatusCreated).JSON(updatedOrder)
}

// EditOrder permite editar una orden de forma granular (agregar, modificar, eliminar items y cambiar metadatos)
// Solo disponible para órdenes en estado "pendiente_aprobacion" o "rechazado"
func (h *OrderHandler) EditOrder(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	userID, _ := uuid.Parse(c.Locals("user_id").(string))

	payload := new(domain.EditOrderRequest)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	updatedOrder, err := h.orderService.EditOrder(orderID, userID, *payload)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(updatedOrder)
}

type LinkOrderPayload struct {
	ParentOrderID uuid.UUID `json:"parent_order_id"`
}

func (h *OrderHandler) LinkOrder(c *fiber.Ctx) error {
	orderID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	payload := new(LinkOrderPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	updatedOrder, err := h.orderService.LinkOrderToParent(orderID, payload.ParentOrderID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(updatedOrder)
}
