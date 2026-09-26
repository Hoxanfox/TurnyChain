package repository

import (
	"database/sql"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
)

type InventoryReceiptRepository interface {
	CreateReceipt(receipt *domain.InventoryReceipt) error
	GetReceipts() ([]domain.InventoryReceipt, error)
	GetStock() ([]domain.InventoryStock, error)
}

func (r *postgresInventoryReceiptRepository) GetReceipts() ([]domain.InventoryReceipt, error) {
	rows, err := r.db.Query(`
		SELECT id, receipt_number, received_by, supplier_name, COALESCE(notes, ''), status, total, created_at
		FROM inventory_receipts
		ORDER BY created_at DESC
	`)
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
		receipt.Lines = make([]domain.InventoryReceiptLine, 0)
		lineRows, err := r.db.Query(`
			SELECT id, item_name, quantity, unit, unit_cost, line_total
			FROM inventory_receipt_lines
			WHERE receipt_id = $1
			ORDER BY id ASC
		`, receipt.ID)
		if err != nil {
			return nil, err
		}
		for lineRows.Next() {
			var line domain.InventoryReceiptLine
			if err := lineRows.Scan(&line.ID, &line.ItemName, &line.Quantity, &line.Unit, &line.UnitCost, &line.LineTotal); err != nil {
				lineRows.Close()
				return nil, err
			}
			receipt.Lines = append(receipt.Lines, line)
		}
		if err := lineRows.Err(); err != nil {
			lineRows.Close()
			return nil, err
		}
		lineRows.Close()
		receipts = append(receipts, receipt)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return receipts, nil
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
				(id, receipt_id, item_name, quantity, unit, unit_cost, line_total)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, line.ID, receipt.ID, line.ItemName, line.Quantity, line.Unit, line.UnitCost, line.LineTotal)
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
