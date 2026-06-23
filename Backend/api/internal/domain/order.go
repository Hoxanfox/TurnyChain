// =================================================================
// ARCHIVO 1: /internal/domain/order.go (FINAL)
// =================================================================
package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// CustomizationsInput es lo que recibe el backend desde el frontend (solo IDs)
// El frontend envía lo que NO quiere el cliente
type CustomizationsInput struct {
	RemovedIngredientIDs       []uuid.UUID `json:"removed_ingredient_ids"`       // Ingredientes que NO quiere
	UnselectedAccompanimentIDs []uuid.UUID `json:"unselected_accompaniment_ids"` // Acompañamientos que NO quiere
}

// Customizations es lo que se almacena en BD y se devuelve al frontend (datos completos)
// Solo contiene los elementos que SÍ seleccionó el cliente (filtrados)
type Customizations struct {
	ActiveIngredients      []Ingredient    `json:"active_ingredients"`      // Ingredientes que SÍ lleva (todos - removidos)
	SelectedAccompaniments []Accompaniment `json:"selected_accompaniments"` // Acompañamientos que SÍ lleva (todos - no seleccionados)
}

func (c Customizations) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *Customizations) Scan(value interface{}) error {
	if value == nil {
		*c = Customizations{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &c)
}

type Order struct {
	ID            uuid.UUID   `json:"id" db:"id"`
	ParentOrderID *uuid.UUID  `json:"parent_order_id,omitempty" db:"parent_order_id"`
	WaiterID      uuid.UUID   `json:"waiter_id" db:"waiter_id"`
	WaiterName    string      `json:"waiter_name,omitempty" db:"waiter_name"`
	CashierID     *uuid.UUID  `json:"cashier_id,omitempty" db:"cashier_id"`
	TableID       uuid.UUID   `json:"table_id" db:"table_id"`
	TableNumber   int         `json:"table_number" db:"table_number"`
	Status        string      `json:"status" db:"status"`
	Total         float64     `json:"total" db:"total"`
	Items         []OrderItem `json:"items"`
	CreatedAt     time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at" db:"updated_at"`
	// Tipo de orden: "mesa" (permite híbridos), "llevar" (todo empacado), "domicilio" (todo empacado + dirección)
	OrderType string `json:"order_type" db:"order_type"`
	// Cash Session ID to link this order to a specific cash register session
	CashSessionID *uuid.UUID `json:"cash_session_id,omitempty" db:"cash_session_id"`
	// Nombre del cliente (obligatorio para "llevar" y "domicilio")
	CustomerName *string `json:"customer_name,omitempty" db:"customer_name"`
	// Campos para órdenes a domicilio (solo cuando order_type = "domicilio")
	DeliveryAddress *string `json:"delivery_address,omitempty" db:"delivery_address"`
	DeliveryPhone   *string `json:"delivery_phone,omitempty" db:"delivery_phone"`
	DeliveryNotes   *string `json:"delivery_notes,omitempty" db:"delivery_notes"`
	// Nuevos campos para el flujo de pago con evidencia
	PaymentMethod    *string   `json:"payment_method,omitempty" db:"payment_method"`
	PaymentProofPath *string   `json:"payment_proof_path,omitempty" db:"payment_proof_path"`
	Payments         []Payment `json:"payments,omitempty"` // Arreglo de pagos múltiples (Split Payments)
	BlockchainTxHash *string   `json:"blockchain_tx_hash,omitempty" db:"blockchain_tx_hash"`
	// Estado de impresión de comandas
	PrintStatus        string     `json:"print_status" db:"print_status"`
	PrintAttempts      int        `json:"print_attempts" db:"print_attempts"`
	LastPrintError     *string    `json:"last_print_error,omitempty" db:"last_print_error"`
	PrintedAt          *time.Time `json:"printed_at,omitempty" db:"printed_at"`
	LastPrintAttemptAt *time.Time `json:"last_print_attempt_at,omitempty" db:"last_print_attempt_at"`
	EditHistory        EditHistory  `json:"edit_history,omitempty" db:"edit_history"`
}

type EditHistoryEntry struct {
	Timestamp   time.Time `json:"timestamp"`
	UserID      uuid.UUID `json:"user_id"`
	UserRole    string    `json:"user_role"`
	Reason      string    `json:"reason"`
	Changes     string    `json:"changes"`
}

type EditHistory []EditHistoryEntry

func (e EditHistory) Value() (driver.Value, error) {
	if len(e) == 0 {
		return nil, nil
	}
	return json.Marshal(e)
}

func (e *EditHistory) Scan(value interface{}) error {
	if value == nil {
		*e = EditHistory{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &e)
}

type OrderItem struct {
	MenuItemID          uuid.UUID            `json:"menu_item_id" db:"menu_item_id"`
	MenuItemName        string               `json:"menu_item_name,omitempty" db:"name"`
	Quantity            int                  `json:"quantity" db:"quantity"`
	PriceAtOrder        float64              `json:"price_at_order" db:"price_at_order"`
	Notes               *string              `json:"notes,omitempty" db:"notes"`
	Customizations      Customizations       `json:"customizations" db:"customizations"`
	CustomizationsInput *CustomizationsInput `json:"customizations_input,omitempty" db:"-"` // Solo para input, no se guarda en BD
	IsTakeout           bool                 `json:"is_takeout" db:"is_takeout"`            // Indica si este item específico es para llevar
	// Campos para tickets de cocina (obtenidos por JOIN)
	CategoryID          *uuid.UUID `json:"category_id,omitempty" db:"category_id"`
	CategoryStationID   *uuid.UUID `json:"category_station_id,omitempty" db:"category_station_id"`
	CategoryStationName string     `json:"category_station_name,omitempty" db:"category_station_name"`
}

type Payment struct {
	ID               uuid.UUID `json:"id" db:"id"`
	OrderID          uuid.UUID `json:"order_id" db:"order_id"`
	Amount           float64   `json:"amount" db:"amount"`
	Method           string    `json:"method" db:"payment_method"`
	PaymentProofPath *string    `json:"payment_proof_path,omitempty" db:"payment_proof_path"`
	CashSessionID    *uuid.UUID `json:"cash_session_id,omitempty" db:"cash_session_id"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}

// EditOrderRequest estructura para edición granular de órdenes
type EditOrderRequest struct {
	// Operaciones sobre items
	AddItems    []OrderItem    `json:"add_items,omitempty"`    // Items nuevos a agregar
	UpdateItems []UpdateItemOp `json:"update_items,omitempty"` // Items a modificar (por índice)
	RemoveItems []int          `json:"remove_items,omitempty"` // Índices de items a eliminar
	// Modificaciones a nivel de orden
	OrderType       *string `json:"order_type,omitempty"`       // "mesa", "llevar", "domicilio"
	DeliveryAddress *string `json:"delivery_address,omitempty"` // Cambiar dirección de entrega
	DeliveryPhone   *string `json:"delivery_phone,omitempty"`   // Cambiar teléfono de entrega
	DeliveryNotes   *string `json:"delivery_notes,omitempty"`   // Cambiar notas de entrega
	TableNumber     *int    `json:"table_number,omitempty"`     // Cambiar mesa (solo para order_type="mesa")
	// Historial y razón
	EditReason      string  `json:"edit_reason,omitempty"`      // Razón de la modificación
	// Reconciliación de pagos
	OverridePayments []Payment `json:"override_payments,omitempty"` // Nuevos pagos obligatorios si cambia el total de una orden pagada
}

// UpdateItemOp representa una operación de actualización sobre un item específico
type UpdateItemOp struct {
	Index               int                  `json:"index"`                          // Índice del item en el array (0-based)
	Quantity            *int                 `json:"quantity,omitempty"`             // Nueva cantidad
	PriceAtOrder        *float64             `json:"price_at_order,omitempty"`       // Nuevo precio unitario
	Notes               *string              `json:"notes,omitempty"`                // Nuevas notas
	CustomizationsInput *CustomizationsInput `json:"customizations_input,omitempty"` // Nuevas customizaciones
	IsTakeout           *bool                `json:"is_takeout,omitempty"`           // Cambiar si es para llevar
}
