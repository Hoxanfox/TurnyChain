// =================================================================
// ARCHIVO 1: /internal/domain/menu_and_orders.go (NUEVO ARCHIVO)
// Propósito: Definir los modelos de datos para el menú y las órdenes.
// =================================================================
package domain

import (
	"time"
	"github.com/google/uuid"
)

// MenuItem representa un ítem en el menú del restaurante.
type MenuItem struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Price       float64   `json:"price" db:"price"`
	Category    string    `json:"category" db:"category"`
}

// Order representa una orden completa.
type Order struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	WaiterID    uuid.UUID   `json:"waiter_id" db:"waiter_id"`
	CashierID   *uuid.UUID  `json:"cashier_id,omitempty" db:"cashier_id"`
	TableNumber int         `json:"table_number" db:"table_number"`
	Status      string      `json:"status" db:"status"`
	Total       float64     `json:"total" db:"total"`
	Items       []OrderItem `json:"items"` // Se poblará al pedir el detalle de la orden
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
}

// OrderItem representa un ítem específico dentro de una orden.
type OrderItem struct {
	OrderID      uuid.UUID `json:"-" db:"order_id"`
	MenuItemID   uuid.UUID `json:"menu_item_id" db:"menu_item_id"`
	Quantity     int       `json:"quantity" db:"quantity"`
	PriceAtOrder float64   `json:"price_at_order" db:"price_at_order"`
	Notes        *string   `json:"notes,omitempty" db:"notes"` // <-- ¡NUEVO CAMPO! Puntero para admitir nulos.
}