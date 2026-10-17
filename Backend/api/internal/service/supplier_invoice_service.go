package service

import (
	"errors"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type SupplierInvoiceService interface {
	CreateInvoice(userID uuid.UUID, input SupplierInvoiceInput) (*domain.SupplierInvoice, error)
	UpdateInvoice(id uuid.UUID, input SupplierInvoiceInput) (*domain.SupplierInvoice, error)
	DeleteInvoice(id uuid.UUID) error
	GetInvoices() ([]domain.SupplierInvoice, error)
	GetInvoice(id uuid.UUID) (*domain.SupplierInvoice, error)
	AddPayment(userID, invoiceID uuid.UUID, input SupplierInvoicePaymentInput) (*domain.SupplierInvoice, error)
}

type SupplierInvoiceInput struct {
	InvoiceNumber string     `json:"invoice_number"`
	SupplierName  string     `json:"supplier_name"`
	IssueDate     time.Time  `json:"issue_date"`
	DueDate       *time.Time `json:"due_date,omitempty"`
	Total         float64    `json:"total"`
	Notes         string     `json:"notes"`
	AttachmentPath *string   `json:"-"`
}

type SupplierInvoicePaymentInput struct {
	Amount        float64   `json:"amount"`
	PaymentMethod string    `json:"payment_method"`
	PaymentDate   time.Time `json:"payment_date"`
	Reference     string    `json:"reference"`
	Notes         string    `json:"notes"`
}

type supplierInvoiceService struct { repo repository.SupplierInvoiceRepository }

func NewSupplierInvoiceService(repo repository.SupplierInvoiceRepository) SupplierInvoiceService {
	return &supplierInvoiceService{repo: repo}
}

func (s *supplierInvoiceService) CreateInvoice(userID uuid.UUID, input SupplierInvoiceInput) (*domain.SupplierInvoice, error) {
	if err := validateInvoiceInput(input); err != nil { return nil, err }
	now := time.Now().UTC()
	invoice := &domain.SupplierInvoice{ID: uuid.New(), InvoiceNumber: strings.TrimSpace(input.InvoiceNumber), SupplierName: strings.TrimSpace(input.SupplierName), IssueDate: input.IssueDate, DueDate: input.DueDate, Total: input.Total, Notes: strings.TrimSpace(input.Notes), AttachmentPath: input.AttachmentPath, CreatedBy: userID, CreatedAt: now, UpdatedAt: now, Payments: []domain.SupplierInvoicePayment{}}
	if err := s.repo.CreateInvoice(invoice); err != nil { return nil, err }
	return s.repo.GetInvoice(invoice.ID)
}

func (s *supplierInvoiceService) UpdateInvoice(id uuid.UUID, input SupplierInvoiceInput) (*domain.SupplierInvoice, error) {
	if err := validateInvoiceInput(input); err != nil { return nil, err }
	invoice, err := s.repo.GetInvoice(id)
	if err != nil { return nil, err }
	if input.Total < invoice.PaidTotal {
		return nil, errors.New("el total no puede ser menor que los pagos registrados")
	}
	invoice.InvoiceNumber = strings.TrimSpace(input.InvoiceNumber)
	invoice.SupplierName = strings.TrimSpace(input.SupplierName)
	invoice.IssueDate = input.IssueDate
	invoice.DueDate = input.DueDate
	invoice.Total = input.Total
	invoice.Notes = strings.TrimSpace(input.Notes)
	invoice.AttachmentPath = input.AttachmentPath
	invoice.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpdateInvoice(invoice); err != nil { return nil, err }
	return s.repo.GetInvoice(id)
}

func (s *supplierInvoiceService) DeleteInvoice(id uuid.UUID) error { return s.repo.DeleteInvoice(id) }
func (s *supplierInvoiceService) GetInvoices() ([]domain.SupplierInvoice, error) { return s.repo.GetInvoices() }
func (s *supplierInvoiceService) GetInvoice(id uuid.UUID) (*domain.SupplierInvoice, error) { return s.repo.GetInvoice(id) }

func (s *supplierInvoiceService) AddPayment(userID, invoiceID uuid.UUID, input SupplierInvoicePaymentInput) (*domain.SupplierInvoice, error) {
	if input.Amount <= 0 { return nil, errors.New("el monto del pago debe ser mayor que cero") }
	if input.PaymentMethod != "efectivo" && input.PaymentMethod != "transferencia" && input.PaymentMethod != "otro" { return nil, errors.New("medio de pago inválido") }
	invoice, err := s.repo.GetInvoice(invoiceID)
	if err != nil { return nil, err }
	if input.PaymentDate.IsZero() { input.PaymentDate = time.Now().UTC() }
	payment := &domain.SupplierInvoicePayment{ID: uuid.New(), InvoiceID: invoiceID, Amount: input.Amount, PaymentMethod: input.PaymentMethod, PaymentDate: input.PaymentDate, Reference: strings.TrimSpace(input.Reference), Notes: strings.TrimSpace(input.Notes), CreatedBy: userID, CreatedAt: time.Now().UTC()}
	if err := s.repo.AddPayment(payment); err != nil { return nil, err }
	return s.repo.GetInvoice(invoice.ID)
}

func validateInvoiceInput(input SupplierInvoiceInput) error {
	if strings.TrimSpace(input.InvoiceNumber) == "" { return errors.New("el número de factura es obligatorio") }
	if strings.TrimSpace(input.SupplierName) == "" { return errors.New("el proveedor es obligatorio") }
	if input.IssueDate.IsZero() { return errors.New("la fecha de emisión es obligatoria") }
	if input.Total <= 0 { return errors.New("el total debe ser mayor que cero") }
	return nil
}