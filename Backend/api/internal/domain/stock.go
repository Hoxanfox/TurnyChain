package domain

import (
	"fmt"

	"github.com/google/uuid"
)

// StockConflictError indica que la reserva solicitada excede las existencias
// disponibles del producto. Los handlers lo traducen a un HTTP 409.
type StockConflictError struct{ ItemName string }

func (e *StockConflictError) Error() string {
	return fmt.Sprintf("no hay existencias suficientes de %s", e.ItemName)
}

type StockItem struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	CategoryID    uuid.UUID `json:"category_id"`
	CategoryName  string    `json:"category_name"`
	Quantity      float64   `json:"quantity"`
	WarehouseQuantity float64 `json:"warehouse_quantity"`
	DisplayQuantity float64 `json:"display_quantity"`
	AvailableQuantity float64 `json:"available_quantity"`
	ImageURL         string  `json:"image_url,omitempty"`
}

type StockReceiptLine struct {
	ItemID   uuid.UUID `json:"item_id"`
	Quantity float64   `json:"quantity"`
	UnitCost float64   `json:"unit_cost"`
}

type StockReceipt struct {
	SupplierName string             `json:"supplier_name"`
	Notes        string             `json:"notes"`
	Lines        []StockReceiptLine `json:"lines"`
}
