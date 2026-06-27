package domain

import (
	"time"
)

type BankTransfer struct {
	ID        string    `json:"id"`
	Sender    string    `json:"sender"`
	Amount    float64   `json:"amount"`
	BankName  string    `json:"bank_name"`
	Timestamp time.Time `json:"timestamp"`
	IsUsed    bool      `json:"is_used"`
	OrderID   *string   `json:"order_id,omitempty"` // The order this transfer was used for
	RawText   string    `json:"raw_text"` // Original email text
}
