// =================================================================
// ARCHIVO 4: /internal/domain/menu_item.go (CORREGIDO Y SIMPLIFICADO)
// =================================================================
package domain

import "github.com/google/uuid"

type MenuItem struct {
	ID             uuid.UUID       `json:"id" db:"id"`
	Name           string          `json:"name" db:"name"`
	Description    string          `json:"description" db:"description"`
	Price          float64         `json:"price" db:"price"`
	CategoryID     uuid.UUID       `json:"category_id" db:"category_id"`
	CategoryName   string          `json:"category_name" db:"category_name"`
	TracksStock    bool            `json:"tracks_stock" db:"tracks_stock"`
	IsAvailable    bool            `json:"is_available" db:"is_available"`
	OrderCount     int             `json:"order_count" db:"order_count"`
	StockQuantity  float64         `json:"stock_quantity" db:"stock_quantity"`
	WarehouseQuantity float64      `json:"warehouse_quantity" db:"warehouse_quantity"`
	DisplayQuantity float64        `json:"display_quantity" db:"display_quantity"`
	Ingredients    []Ingredient    `json:"ingredients,omitempty"`
	Accompaniments []Accompaniment `json:"accompaniments,omitempty"`
}
