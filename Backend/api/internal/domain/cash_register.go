package domain

import (
	"time"

	"github.com/google/uuid"
)

type CashRegisterSession struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	Status            string     `json:"status" db:"status"` // "open" or "closed"
	OpenTime          time.Time  `json:"open_time" db:"open_time"`
	CloseTime             *time.Time `json:"close_time,omitempty" db:"close_time"`
	InitialCash           float64    `json:"initial_cash" db:"initial_cash"`
	InitialTransfer       float64    `json:"initial_transfer" db:"initial_transfer"`
	FinalCashExpected     *float64   `json:"final_cash_expected,omitempty" db:"final_cash_expected"`
	FinalCashActual       *float64   `json:"final_cash_actual,omitempty" db:"final_cash_actual"`
	Discrepancy           *float64   `json:"discrepancy,omitempty" db:"discrepancy"`
	FinalTransferExpected *float64   `json:"final_transfer_expected,omitempty" db:"final_transfer_expected"`
	FinalTransferActual   *float64   `json:"final_transfer_actual,omitempty" db:"final_transfer_actual"`
	TransferDiscrepancy   *float64   `json:"transfer_discrepancy,omitempty" db:"transfer_discrepancy"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

type CashRegisterExpense struct {
	ID          uuid.UUID `json:"id" db:"id"`
	SessionID   uuid.UUID `json:"session_id" db:"session_id"`
	Amount      float64   `json:"amount" db:"amount"`
	Description string    `json:"description" db:"description"`
	ImagePath   *string   `json:"image_path,omitempty" db:"image_path"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type CashRegisterSessionDetails struct {
	Session                   *CashRegisterSession  `json:"session"`
	Expenses                  []CashRegisterExpense `json:"expenses"`
	TotalCashSales            float64               `json:"total_cash_sales"`
	TotalTransfer             float64               `json:"total_transfer"`
	TotalExpenses             float64               `json:"total_expenses"`
	ExpectedCash              float64               `json:"expected_cash"`
	CashTransactionsCount     int                   `json:"cash_transactions_count"`
	TransferTransactionsCount int                   `json:"transfer_transactions_count"`
}
