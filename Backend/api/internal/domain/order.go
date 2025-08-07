// =================================================================
// ARCHIVO 1: /internal/domain/order.go (ACTUALIZADO)
// Propósito: Añadir el campo TableID a la estructura de la orden.
// =================================================================
package domain

import (
	"time"
	"github.com/google/uuid"
)

type Order struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	WaiterID    uuid.UUID   `json:"waiter_id" db:"waiter_id"`
	CashierID   *uuid.UUID  `json:"cashier_id,omitempty" db:"cashier_id"`
	TableID     uuid.UUID   `json:"table_id" db:"table_id"` // <-- NUEVO CAMPO
	TableNumber int         `json:"table_number" db:"table_number"`
	Status      string      `json:"status" db:"status"`
	Total       float64     `json:"total" db:"total"`
	Items       []OrderItem `json:"items"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
}

type OrderItem struct {
	OrderID      uuid.UUID `json:"-" db:"order_id"`
	MenuItemID   uuid.UUID `json:"menu_item_id" db:"menu_item_id"`
	Quantity     int       `json:"quantity" db:"quantity"`
	PriceAtOrder float64   `json:"price_at_order" db:"price_at_order"`
	Notes        *string   `json:"notes,omitempty" db:"notes"`
}