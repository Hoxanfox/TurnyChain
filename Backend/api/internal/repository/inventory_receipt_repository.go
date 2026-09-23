package repository

import (
	"database/sql"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type InventoryReceiptRepository interface {
	CreateReceipt(receipt *domain.InventoryReceipt) error
	GetStock() ([]domain.InventoryStock, error)
	GetReceipts(userID uuid.UUID, includeAll bool) ([]domain.InventoryReceipt, error)
	UpdateReceipt(receipt *domain.InventoryReceipt) error
	DeleteReceipt(receiptID uuid.UUID) error
	SaveDraft(userID uuid.UUID, payload []byte) error
	GetDraft(userID uuid.UUID) ([]byte, error)
	DeleteDraft(userID uuid.UUID) error
}

func (r *postgresInventoryReceiptRepository) GetStock() ([]domain.InventoryStock, error) {
	rows, err := r.db.Query(`
		SELECT item_name, unit, quantity, total_cost, updated_at
		FROM inventory_stock
		ORDER BY item_name ASC, unit ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stock := make([]domain.InventoryStock, 0)
	for rows.Next() {
		var item domain.InventoryStock
		if err := rows.Scan(&item.ItemName, &item.Unit, &item.Quantity, &item.TotalCost, &item.UpdatedAt); err != nil {
			return nil, err
		}
		stock = append(stock, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return stock, nil
}

type postgresInventoryReceiptRepository struct {
	db *sql.DB
}

func NewInventoryReceiptRepository(db *sql.DB) InventoryReceiptRepository {
	return &postgresInventoryReceiptRepository{db: db}
}

func (r *postgresInventoryReceiptRepository) CreateReceipt(receipt *domain.InventoryReceipt) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO inventory_receipts
			(id, receipt_number, received_by, supplier_name, notes, status, total, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, receipt.ID, receipt.ReceiptNumber, receipt.ReceivedBy, receipt.SupplierName, receipt.Notes, receipt.Status, receipt.Total, receipt.CreatedAt)
	if err != nil {
		return err
	}

	for index := range receipt.Lines {
		line := &receipt.Lines[index]
		_, err = tx.Exec(`
			INSERT INTO inventory_receipt_lines
				(id, receipt_id, item_name, quantity, portion_quantities, unit, unit_cost, line_total)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, line.ID, receipt.ID, line.ItemName, line.Quantity, pq.Array(line.Portions), line.Unit, line.UnitCost, line.LineTotal)
		if err != nil {
			return err
		}
		_, err = tx.Exec(`
			INSERT INTO inventory_stock (item_name, unit, quantity, total_cost, updated_at)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (item_name, unit) DO UPDATE SET
				quantity = inventory_stock.quantity + EXCLUDED.quantity,
				total_cost = inventory_stock.total_cost + EXCLUDED.total_cost,
				updated_at = EXCLUDED.updated_at
		`, line.ItemName, line.Unit, line.Quantity, line.LineTotal, receipt.CreatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *postgresInventoryReceiptRepository) GetReceipts(userID uuid.UUID, includeAll bool) ([]domain.InventoryReceipt, error) {
	query := `SELECT id, receipt_number, received_by, supplier_name, notes, status, total, created_at FROM inventory_receipts`
	args := []interface{}{}
	if !includeAll {
		query += ` WHERE received_by = $1`
		args = append(args, userID)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	receipts := make([]domain.InventoryReceipt, 0)
	for rows.Next() {
		var receipt domain.InventoryReceipt
		if err := rows.Scan(&receipt.ID, &receipt.ReceiptNumber, &receipt.ReceivedBy, &receipt.SupplierName, &receipt.Notes, &receipt.Status, &receipt.Total, &receipt.CreatedAt); err != nil {
			return nil, err
		}
		if err := r.loadReceiptLines(&receipt); err != nil {
			return nil, err
		}
		receipts = append(receipts, receipt)
	}
	return receipts, rows.Err()
}

func (r *postgresInventoryReceiptRepository) loadReceiptLines(receipt *domain.InventoryReceipt) error {
	rows, err := r.db.Query(`SELECT id, item_name, quantity, portion_quantities, unit, unit_cost, line_total FROM inventory_receipt_lines WHERE receipt_id = $1 ORDER BY id`, receipt.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	receipt.Lines = make([]domain.InventoryReceiptLine, 0)
	for rows.Next() {
		var line domain.InventoryReceiptLine
		if err := rows.Scan(&line.ID, &line.ItemName, &line.Quantity, pq.Array(&line.Portions), &line.Unit, &line.UnitCost, &line.LineTotal); err != nil {
			return err
		}
		receipt.Lines = append(receipt.Lines, line)
	}
	return rows.Err()
}

func (r *postgresInventoryReceiptRepository) UpdateReceipt(receipt *domain.InventoryReceipt) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.Exec(`UPDATE inventory_receipts SET supplier_name = $1, notes = $2, total = $3 WHERE id = $4 AND status = 'registered'`, receipt.SupplierName, receipt.Notes, receipt.Total, receipt.ID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return sql.ErrNoRows
	}
	if _, err = tx.Exec(`DELETE FROM inventory_receipt_lines WHERE receipt_id = $1`, receipt.ID); err != nil {
		return err
	}
	for _, line := range receipt.Lines {
		if _, err = tx.Exec(`INSERT INTO inventory_receipt_lines (id, receipt_id, item_name, quantity, portion_quantities, unit, unit_cost, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, line.ID, receipt.ID, line.ItemName, line.Quantity, pq.Array(line.Portions), line.Unit, line.UnitCost, line.LineTotal); err != nil {
			return err
		}
	}
	if err := rebuildInventoryStock(tx); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *postgresInventoryReceiptRepository) DeleteReceipt(receiptID uuid.UUID) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.Exec(`DELETE FROM inventory_receipts WHERE id = $1 AND status = 'registered'`, receiptID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return sql.ErrNoRows
	}
	if err := rebuildInventoryStock(tx); err != nil {
		return err
	}
	return tx.Commit()
}

func rebuildInventoryStock(tx *sql.Tx) error {
	if _, err := tx.Exec(`TRUNCATE inventory_stock`); err != nil {
		return err
	}
	_, err := tx.Exec(`INSERT INTO inventory_stock (item_name, unit, quantity, total_cost, updated_at)
		SELECT l.item_name, l.unit, SUM(l.quantity), SUM(l.line_total), now()
		FROM inventory_receipt_lines l JOIN inventory_receipts r ON r.id = l.receipt_id
		WHERE r.status = 'registered' GROUP BY l.item_name, l.unit`)
	return err
}

func (r *postgresInventoryReceiptRepository) SaveDraft(userID uuid.UUID, payload []byte) error {
	_, err := r.db.Exec(`INSERT INTO inventory_receipt_drafts (user_id, payload, updated_at)
		VALUES ($1, $2::jsonb, now())
		ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`, userID, payload)
	return err
}

func (r *postgresInventoryReceiptRepository) GetDraft(userID uuid.UUID) ([]byte, error) {
	var payload []byte
	err := r.db.QueryRow(`SELECT payload FROM inventory_receipt_drafts WHERE user_id = $1`, userID).Scan(&payload)
	return payload, err
}

func (r *postgresInventoryReceiptRepository) DeleteDraft(userID uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM inventory_receipt_drafts WHERE user_id = $1`, userID)
	return err
}
