package domain

import (
	"time"
	"github.com/google/uuid"
)

type CashierSession struct {
	ID            uuid.UUID        `json:"id"`
	CashierID     uuid.UUID        `json:"cashier_id"`
	CashierName   string           `json:"cashier_name,omitempty"`
	InitialFund   float64          `json:"initial_fund"`
	OpenedAt      time.Time        `json:"opened_at"`
	ClosedAt      *time.Time       `json:"closed_at,omitempty"`
	ExpectedCash  *float64         `json:"expected_cash,omitempty"`
	ActualCash    *float64         `json:"actual_cash,omitempty"`
	Discrepancy   *float64         `json:"discrepancy,omitempty"`
	Notes         *string          `json:"notes,omitempty"`
	Status        string           `json:"status"` // "open", "closed"
	Expenses      []CashierExpense `json:"expenses,omitempty"`
	
	// Campos calculados dinámicamente
	CashSales     float64          `json:"cash_sales"`
	TransferSales float64          `json:"transfer_sales"`
	TotalSales    float64          `json:"total_sales"`
	OrdersCount   int              `json:"orders_count"`
}

type CashierExpense struct {
	ID          uuid.UUID `json:"id"`
	SessionID   uuid.UUID `json:"session_id"`
	Amount      float64   `json:"amount"`
	Description string    `json:"description"`
	ImagePath   *string   `json:"image_path,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}
