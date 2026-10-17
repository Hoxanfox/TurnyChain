package repository

import (
	"database/sql"
	"errors"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type SupplierInvoiceRepository interface {
	CreateInvoice(invoice *domain.SupplierInvoice) error
	UpdateInvoice(invoice *domain.SupplierInvoice) error
	DeleteInvoice(id uuid.UUID) error
	GetInvoices() ([]domain.SupplierInvoice, error)
	GetInvoice(id uuid.UUID) (*domain.SupplierInvoice, error)
	AddPayment(payment *domain.SupplierInvoicePayment) error
}

type postgresSupplierInvoiceRepository struct { db *sql.DB }

func NewSupplierInvoiceRepository(db *sql.DB) SupplierInvoiceRepository {
	return &postgresSupplierInvoiceRepository{db: db}
}

func (r *postgresSupplierInvoiceRepository) CreateInvoice(invoice *domain.SupplierInvoice) error {
	_, err := r.db.Exec(`INSERT INTO supplier_invoices (id, invoice_number, supplier_name, issue_date, due_date, total, notes, attachment_path, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`, invoice.ID, invoice.InvoiceNumber, invoice.SupplierName, invoice.IssueDate, invoice.DueDate, invoice.Total, invoice.Notes, invoice.AttachmentPath, invoice.CreatedBy, invoice.CreatedAt)
	return err
}

func (r *postgresSupplierInvoiceRepository) UpdateInvoice(invoice *domain.SupplierInvoice) error {
	_, err := r.db.Exec(`UPDATE supplier_invoices SET invoice_number=$1, supplier_name=$2, issue_date=$3, due_date=$4, total=$5, notes=$6, attachment_path=COALESCE($7, attachment_path), updated_at=$8 WHERE id=$9`, invoice.InvoiceNumber, invoice.SupplierName, invoice.IssueDate, invoice.DueDate, invoice.Total, invoice.Notes, invoice.AttachmentPath, invoice.UpdatedAt, invoice.ID)
	return err
}

func (r *postgresSupplierInvoiceRepository) DeleteInvoice(id uuid.UUID) error {
	var paymentCount int
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM supplier_invoice_payments WHERE invoice_id=$1`, id).Scan(&paymentCount); err != nil { return err }
	if paymentCount > 0 { return errors.New("no se puede borrar una factura con pagos registrados") }
	result, err := r.db.Exec(`DELETE FROM supplier_invoices WHERE id=$1`, id)
	if err != nil { return err }
	rows, err := result.RowsAffected()
	if err != nil { return err }
	if rows == 0 { return sql.ErrNoRows }
	return nil
}

func (r *postgresSupplierInvoiceRepository) GetInvoices() ([]domain.SupplierInvoice, error) {
	rows, err := r.db.Query(`SELECT id, invoice_number, supplier_name, issue_date, due_date, total, notes, attachment_path, created_by, created_at, updated_at FROM supplier_invoices ORDER BY COALESCE(due_date, issue_date) ASC, created_at DESC`)
	if err != nil { return nil, err }
	defer rows.Close()

	invoices := make([]domain.SupplierInvoice, 0)
	for rows.Next() {
		invoice, err := scanSupplierInvoice(rows)
		if err != nil { return nil, err }
		if err := r.loadPayments(invoice); err != nil { return nil, err }
		calculateInvoiceStatus(invoice)
		invoices = append(invoices, *invoice)
	}
	return invoices, rows.Err()
}

func (r *postgresSupplierInvoiceRepository) GetInvoice(id uuid.UUID) (*domain.SupplierInvoice, error) {
	row := r.db.QueryRow(`SELECT id, invoice_number, supplier_name, issue_date, due_date, total, notes, attachment_path, created_by, created_at, updated_at FROM supplier_invoices WHERE id=$1`, id)
	invoice, err := scanSupplierInvoice(row)
	if err != nil { return nil, err }
	if err := r.loadPayments(invoice); err != nil { return nil, err }
	calculateInvoiceStatus(invoice)
	return invoice, nil
}

func (r *postgresSupplierInvoiceRepository) AddPayment(payment *domain.SupplierInvoicePayment) error {
	_, err := r.db.Exec(`INSERT INTO supplier_invoice_payments (id, invoice_id, amount, payment_method, payment_date, reference, notes, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, payment.ID, payment.InvoiceID, payment.Amount, payment.PaymentMethod, payment.PaymentDate, payment.Reference, payment.Notes, payment.CreatedBy, payment.CreatedAt)
	return err
}

type scanner interface { Scan(dest ...interface{}) error }

func scanSupplierInvoice(row scanner) (*domain.SupplierInvoice, error) {
	invoice := &domain.SupplierInvoice{}
	var dueDate sql.NullTime
	var notes, attachment sql.NullString
	err := row.Scan(&invoice.ID, &invoice.InvoiceNumber, &invoice.SupplierName, &invoice.IssueDate, &dueDate, &invoice.Total, &notes, &attachment, &invoice.CreatedBy, &invoice.CreatedAt, &invoice.UpdatedAt)
	if err != nil { return nil, err }
	if dueDate.Valid { invoice.DueDate = &dueDate.Time }
	if notes.Valid { invoice.Notes = notes.String }
	if attachment.Valid { invoice.AttachmentPath = &attachment.String }
	invoice.Payments = make([]domain.SupplierInvoicePayment, 0)
	return invoice, nil
}

func (r *postgresSupplierInvoiceRepository) loadPayments(invoice *domain.SupplierInvoice) error {
	rows, err := r.db.Query(`SELECT id, invoice_id, amount, payment_method, payment_date, reference, notes, created_by, created_at FROM supplier_invoice_payments WHERE invoice_id=$1 ORDER BY payment_date ASC, created_at ASC`, invoice.ID)
	if err != nil { return err }
	defer rows.Close()
	for rows.Next() {
		var payment domain.SupplierInvoicePayment
		var reference, notes sql.NullString
		if err := rows.Scan(&payment.ID, &payment.InvoiceID, &payment.Amount, &payment.PaymentMethod, &payment.PaymentDate, &reference, &notes, &payment.CreatedBy, &payment.CreatedAt); err != nil { return err }
		if reference.Valid { payment.Reference = reference.String }
		if notes.Valid { payment.Notes = notes.String }
		invoice.Payments = append(invoice.Payments, payment)
	}
	return rows.Err()
}

func calculateInvoiceStatus(invoice *domain.SupplierInvoice) {
	invoice.PaidTotal = 0
	for _, payment := range invoice.Payments { invoice.PaidTotal += payment.Amount }
	invoice.Balance = invoice.Total - invoice.PaidTotal
	if invoice.Balance < 0 { invoice.Balance = 0 }
	invoice.CreditBalance = invoice.PaidTotal - invoice.Total
	if invoice.CreditBalance < 0 { invoice.CreditBalance = 0 }
	switch {
	case invoice.CreditBalance > 0:
		invoice.Status = "saldo_favor"
	case invoice.PaidTotal <= 0:
		invoice.Status = "pendiente"
	case invoice.Balance > 0:
		invoice.Status = "parcial"
	default:
		invoice.Status = "pagada"
	}
}
