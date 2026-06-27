package repository

import (
	"database/sql"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
)

type BankTransferRepository interface {
	Create(transfer *domain.BankTransfer) error
	GetRecent(limit int) ([]domain.BankTransfer, error)
	MarkAsUsed(transferID string, orderID string) error
	GetUnusedByAmount(amount float64) ([]domain.BankTransfer, error)
}

type bankTransferRepository struct {
	db *sql.DB
}

func NewBankTransferRepository(db *sql.DB) BankTransferRepository {
	// Create table if it doesn't exist
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS bank_transfers (
			id UUID PRIMARY KEY,
			sender VARCHAR(255) NOT NULL,
			amount NUMERIC(10,2) NOT NULL,
			bank_name VARCHAR(100),
			timestamp TIMESTAMPTZ NOT NULL,
			is_used BOOLEAN DEFAULT FALSE,
			order_id UUID,
			raw_text TEXT
		)
	`)
	_, _ = db.Exec(`ALTER TABLE bank_transfers ALTER COLUMN timestamp TYPE TIMESTAMPTZ;`)
	return &bankTransferRepository{db: db}
}

func (r *bankTransferRepository) Create(t *domain.BankTransfer) error {
	query := `
		INSERT INTO bank_transfers (id, sender, amount, bank_name, timestamp, is_used, raw_text)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(query, t.ID, t.Sender, t.Amount, t.BankName, t.Timestamp, t.IsUsed, t.RawText)
	return err
}

func (r *bankTransferRepository) GetRecent(limit int) ([]domain.BankTransfer, error) {
	query := `
		SELECT id, sender, amount, bank_name, timestamp, is_used, order_id, raw_text
		FROM bank_transfers
		ORDER BY timestamp DESC
		LIMIT $1
	`
	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transfers := make([]domain.BankTransfer, 0)
	for rows.Next() {
		var t domain.BankTransfer
		var orderID sql.NullString
		if err := rows.Scan(&t.ID, &t.Sender, &t.Amount, &t.BankName, &t.Timestamp, &t.IsUsed, &orderID, &t.RawText); err != nil {
			return nil, err
		}
		
		// Force Colombia timezone (UTC-5) to prevent JSON marshalling it as UTC 
		colombiaZone := time.FixedZone("UTC-5", -5*3600)
		t.Timestamp = time.Date(t.Timestamp.Year(), t.Timestamp.Month(), t.Timestamp.Day(), t.Timestamp.Hour(), t.Timestamp.Minute(), t.Timestamp.Second(), t.Timestamp.Nanosecond(), colombiaZone)

		if orderID.Valid {
			t.OrderID = &orderID.String
		}
		transfers = append(transfers, t)
	}
	return transfers, nil
}

func (r *bankTransferRepository) MarkAsUsed(transferID string, orderID string) error {
	query := `UPDATE bank_transfers SET is_used = true, order_id = $1 WHERE id = $2`
	_, err := r.db.Exec(query, orderID, transferID)
	return err
}

func (r *bankTransferRepository) GetUnusedByAmount(amount float64) ([]domain.BankTransfer, error) {
	query := `
		SELECT id, sender, amount, bank_name, timestamp, is_used, raw_text
		FROM bank_transfers
		WHERE amount = $1 AND is_used = false
		ORDER BY timestamp DESC
	`
	rows, err := r.db.Query(query, amount)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transfers := make([]domain.BankTransfer, 0)
	for rows.Next() {
		var t domain.BankTransfer
		if err := rows.Scan(&t.ID, &t.Sender, &t.Amount, &t.BankName, &t.Timestamp, &t.IsUsed, &t.RawText); err != nil {
			return nil, err
		}
		
		// Force Colombia timezone (UTC-5)
		colombiaZone := time.FixedZone("UTC-5", -5*3600)
		t.Timestamp = time.Date(t.Timestamp.Year(), t.Timestamp.Month(), t.Timestamp.Day(), t.Timestamp.Hour(), t.Timestamp.Minute(), t.Timestamp.Second(), t.Timestamp.Nanosecond(), colombiaZone)

		transfers = append(transfers, t)
	}
	return transfers, nil
}
