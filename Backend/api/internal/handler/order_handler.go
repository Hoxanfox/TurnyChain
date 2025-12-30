// =================================================================
// ARCHIVO 3: /internal/handler/order_handler.go (FINAL)
// =================================================================
package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

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
	TableNumber     int                `json:"table_number"`
	OrderType       string             `json:"order_type"`       // "mesa", "llevar", "domicilio"
	DeliveryAddress *string            `json:"delivery_address"` // Requerido si order_type = "domicilio"
	DeliveryPhone   *string            `json:"delivery_phone"`   // Requerido si order_type = "domicilio"
	DeliveryNotes   *string            `json:"delivery_notes"`   // Opcional
	Items           []domain.OrderItem `json:"items"`
}

func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
	payload := new(CreateOrderPayload)
	if err := c.BodyParser(payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}
	waiterID, _ := uuid.Parse(c.Locals("user_id").(string))
	order, err := h.orderService.CreateOrder(waiterID, payload.TableNumber, payload.OrderType, payload.DeliveryAddress, payload.DeliveryPhone, payload.DeliveryNotes, payload.Items)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(order)
}

func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
	userID, _ := uuid.Parse(c.Locals("user_id").(string))
	userRole := c.Locals("user_role").(string)
	status := c.Query("status")
	myOrders := c.Query("my_orders") // Nuevo parámetro

	orders, err := h.orderService.GetOrders(userRole, userID, status, myOrders)
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

	// Obtener el archivo
	file, err := c.FormFile("file")
	if err != nil {
		log.Printf("❌ [Handler] Error al obtener archivo: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file is required"})
	}

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

	// Guardar la ruta relativa en DB
	proofPath := "/static/proofs/" + filename
	order, err := h.orderService.AddPaymentProof(orderID, method, proofPath)
	if err != nil {
		// Intentar limpiar el archivo si DB falla
		_ = os.Remove(destination)
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

	// 4. Crear la orden primero
	order, err := h.orderService.CreateOrder(waiterID, payload.TableNumber, payload.OrderType, payload.DeliveryAddress, payload.DeliveryPhone, payload.DeliveryNotes, payload.Items)
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

	return c.Status(fiber.StatusCreated).JSON(updatedOrder)
}
