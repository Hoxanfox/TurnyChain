package domain

import "github.com/google/uuid"

type StockItem struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	CategoryID    uuid.UUID `json:"category_id"`
	CategoryName  string    `json:"category_name"`
	Quantity      float64   `json:"quantity"`
	WarehouseQuantity float64 `json:"warehouse_quantity"`
	DisplayQuantity float64 `json:"display_quantity"`
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
