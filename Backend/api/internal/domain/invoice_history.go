package domain

import "time"

// InvoiceHistoryItem representa una fila de historial de facturas.
type InvoiceHistoryItem struct {
	OrderID          string    `json:"order_id"`
	TableNumber      int       `json:"table_number"`
	Total            float64   `json:"total"`
	Status           string    `json:"status"`
	PaymentMethod    *string   `json:"payment_method,omitempty"`
	WaiterName       string    `json:"waiter_name,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	BlockchainTxHash *string   `json:"blockchain_tx_hash,omitempty"`
}
