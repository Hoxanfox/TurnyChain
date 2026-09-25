package domain

import (
	"time"

	"github.com/google/uuid"
)

const (
	InventoryUnitKilogram = "kg"
	InventoryUnitGram     = "g"
	InventoryUnitPound    = "lb"
	InventoryUnitItem     = "unidad"
	InventoryUnitBox      = "caja"
)

type InventoryReceipt struct {
	ID            uuid.UUID              `json:"id"`
	ReceiptNumber string                 `json:"receipt_number"`
	ReceivedBy    uuid.UUID              `json:"received_by"`
	SupplierName  string                 `json:"supplier_name"`
	Notes         string                 `json:"notes,omitempty"`
	Status        string                 `json:"status"`
	Total         float64                `json:"total"`
	CreatedAt     time.Time              `json:"created_at"`
	Lines         []InventoryReceiptLine `json:"lines"`
}

type InventoryReceiptLine struct {
	ID        uuid.UUID `json:"id"`
	ItemName  string    `json:"item_name"`
	Quantity  float64   `json:"quantity"`
	Unit      string    `json:"unit"`
	UnitCost  float64   `json:"unit_cost"`
	LineTotal float64   `json:"line_total"`
}

type InventoryStock struct {
	ItemName  string    `json:"item_name"`
	Unit      string    `json:"unit"`
	Quantity  float64   `json:"quantity"`
	TotalCost float64   `json:"total_cost"`
	UpdatedAt time.Time `json:"updated_at"`
}
