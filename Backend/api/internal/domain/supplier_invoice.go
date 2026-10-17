package domain

import (
	"time"

	"github.com/google/uuid"
)

type SupplierInvoice struct {
	ID             uuid.UUID                 `json:"id"`
	InvoiceNumber  string                    `json:"invoice_number"`
	SupplierName   string                    `json:"supplier_name"`
	IssueDate      time.Time                 `json:"issue_date"`
	DueDate        *time.Time                `json:"due_date,omitempty"`
	Total          float64                   `json:"total"`
	PaidTotal      float64                   `json:"paid_total"`
	Balance        float64                   `json:"balance"`
	CreditBalance  float64                   `json:"credit_balance"`
	Status         string                    `json:"status"`
	Notes          string                    `json:"notes,omitempty"`
	AttachmentPath *string                   `json:"attachment_path,omitempty"`
	CreatedBy      uuid.UUID                 `json:"created_by"`
	CreatedAt      time.Time                 `json:"created_at"`
	UpdatedAt      time.Time                 `json:"updated_at"`
	Payments       []SupplierInvoicePayment  `json:"payments"`
}

type SupplierInvoicePayment struct {
	ID            uuid.UUID `json:"id"`
	InvoiceID     uuid.UUID `json:"invoice_id"`
	Amount        float64   `json:"amount"`
	PaymentMethod string    `json:"payment_method"`
	PaymentDate   time.Time `json:"payment_date"`
	Reference     string    `json:"reference,omitempty"`
	Notes         string    `json:"notes,omitempty"`
	CreatedBy     uuid.UUID `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
}