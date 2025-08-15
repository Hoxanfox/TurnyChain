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

// Customizations es un tipo para manejar el campo JSONB.
type Customizations struct {
	RemovedIngredients   []Ingredient  `json:"removed_ingredients"`
	SelectedAccompaniments []Accompaniment `json:"selected_accompaniments"`
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
	if !ok { return errors.New("type assertion to []byte failed") }
	return json.Unmarshal(b, &c)
}

type Order struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	WaiterID    uuid.UUID   `json:"waiter_id" db:"waiter_id"`
	CashierID   *uuid.UUID  `json:"cashier_id,omitempty" db:"cashier_id"`
	TableID     uuid.UUID   `json:"table_id" db:"table_id"`
	TableNumber int         `json:"table_number" db:"table_number"`
	Status      string      `json:"status" db:"status"`
	Total       float64     `json:"total" db:"total"`
	Items       []OrderItem `json:"items"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
}

type OrderItem struct {
	MenuItemID     uuid.UUID      `json:"menu_item_id" db:"menu_item_id"`
	MenuItemName   string         `json:"menu_item_name,omitempty" db:"name"`
	Quantity       int            `json:"quantity" db:"quantity"`
	PriceAtOrder   float64        `json:"price_at_order" db:"price_at_order"`
	Notes          *string        `json:"notes,omitempty" db:"notes"`
	Customizations Customizations `json:"customizations" db:"customizations"`
}