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
	ID          uuid.UUID   `json:"id" db:"id"`
	WaiterID    uuid.UUID   `json:"waiter_id" db:"waiter_id"`
	WaiterName  string      `json:"waiter_name,omitempty" db:"waiter_name"`
	CashierID   *uuid.UUID  `json:"cashier_id,omitempty" db:"cashier_id"`
	TableID     uuid.UUID   `json:"table_id" db:"table_id"`
	TableNumber int         `json:"table_number" db:"table_number"`
	Status      string      `json:"status" db:"status"`
	Total       float64     `json:"total" db:"total"`
	Items       []OrderItem `json:"items"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
	// Tipo de orden: "mesa" (permite híbridos), "llevar" (todo empacado), "domicilio" (todo empacado + dirección)
	OrderType string `json:"order_type" db:"order_type"`
	// Campos para órdenes a domicilio (solo cuando order_type = "domicilio")
	DeliveryAddress *string `json:"delivery_address,omitempty" db:"delivery_address"`
	DeliveryPhone   *string `json:"delivery_phone,omitempty" db:"delivery_phone"`
	DeliveryNotes   *string `json:"delivery_notes,omitempty" db:"delivery_notes"`
	// Nuevos campos para el flujo de pago con evidencia
	PaymentMethod    *string `json:"payment_method,omitempty" db:"payment_method"`
	PaymentProofPath *string `json:"payment_proof_path,omitempty" db:"payment_proof_path"`
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
