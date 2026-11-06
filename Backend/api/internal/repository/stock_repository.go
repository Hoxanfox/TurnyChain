package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type StockRepository interface {
	GetItems() ([]domain.StockItem, error)
	SetQuantity(id uuid.UUID, quantity float64) error
	DeleteQuantity(id uuid.UUID) error
	UpdateLocations(id uuid.UUID, warehouse, display float64) error
	Receive(receivedBy uuid.UUID, receipt domain.StockReceipt) error
	Reserve(items []domain.OrderItem) error
	Restore(items []domain.OrderItem) error
}

type stockRepository struct{ db *sql.DB }

func NewStockRepository(db *sql.DB) StockRepository { return &stockRepository{db: db} }

func (r *stockRepository) GetItems() ([]domain.StockItem, error) {
	rows, err := r.db.Query(`SELECT m.id, m.name, m.category_id, c.name, m.stock_quantity,
		m.warehouse_quantity, m.display_quantity FROM menu_items m
		JOIN categories c ON c.id = m.category_id
		WHERE c.tracks_stock = true AND m.is_available = true ORDER BY c.name, m.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.StockItem, 0)
	for rows.Next() {
		var item domain.StockItem
		if err := rows.Scan(&item.ID, &item.Name, &item.CategoryID, &item.CategoryName,
			&item.Quantity, &item.WarehouseQuantity, &item.DisplayQuantity); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *stockRepository) UpdateLocations(id uuid.UUID, warehouse, display float64) error {
	_, err := r.db.Exec(`UPDATE menu_items SET warehouse_quantity = $1,
		display_quantity = $2, stock_quantity = $1 + $2 WHERE id = $3 AND EXISTS (
		SELECT 1 FROM categories c WHERE c.id = menu_items.category_id AND c.tracks_stock = true
	)`, warehouse, display, id)
	return err
}

func (r *stockRepository) Receive(receivedBy uuid.UUID, receipt domain.StockReceipt) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	receiptID := uuid.New()
	receiptNumber := "INV-" + time.Now().UTC().Format("20060102-150405") + "-" + uuid.New().String()[:8]
	var total float64
	for _, line := range receipt.Lines {
		if line.Quantity <= 0 || line.UnitCost < 0 {
			return fmt.Errorf("cantidad y costo inválidos")
		}
		var name string
		var tracksStock bool
		if err := tx.QueryRow(`SELECT m.name, c.tracks_stock FROM menu_items m
			JOIN categories c ON c.id = m.category_id WHERE m.id = $1`,
			line.ItemID).Scan(&name, &tracksStock); err != nil {
			return err
		}
		if !tracksStock {
			return fmt.Errorf("%s no pertenece a una categoría inventariable", name)
		}
		lineTotal := line.Quantity * line.UnitCost
		total += lineTotal
		if _, err := tx.Exec(`UPDATE menu_items SET warehouse_quantity = warehouse_quantity + $1,
			stock_quantity = stock_quantity + $1 WHERE id = $2`, line.Quantity, line.ItemID); err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO inventory_receipt_lines
			(id, receipt_id, item_name, menu_item_id, quantity, unit, unit_cost, line_total)
			VALUES ($1, $2, $3, $4, $5, 'unidad', $6, $7)`,
			uuid.New(), receiptID, name, line.ItemID, line.Quantity, line.UnitCost, lineTotal); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`INSERT INTO inventory_receipts
		(id, receipt_number, received_by, supplier_name, notes, status, total)
		VALUES ($1, $2, $3, $4, $5, 'registered', $6)`,
		receiptID, receiptNumber, receivedBy, receipt.SupplierName, receipt.Notes, total); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *stockRepository) SetQuantity(id uuid.UUID, quantity float64) error {
	_, err := r.db.Exec(`UPDATE menu_items SET warehouse_quantity = $1,
		display_quantity = 0, stock_quantity = $1 WHERE id = $2 AND EXISTS (
		SELECT 1 FROM categories c WHERE c.id = menu_items.category_id AND c.tracks_stock = true
	)`, quantity, id)
	return err
}

func (r *stockRepository) DeleteQuantity(id uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE menu_items SET warehouse_quantity = 0,
		display_quantity = 0, stock_quantity = 0 WHERE id = $1 AND EXISTS (
		SELECT 1 FROM categories c WHERE c.id = menu_items.category_id AND c.tracks_stock = true
	)`, id)
	return err
}

func (r *stockRepository) Reserve(items []domain.OrderItem) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, item := range items {
		if item.Quantity <= 0 {
			return fmt.Errorf("la cantidad para el producto %s debe ser mayor que cero", item.MenuItemID)
		}
		var name string
		var tracksStock bool
		if err := tx.QueryRow(`SELECT m.name, c.tracks_stock FROM menu_items m
			JOIN categories c ON c.id = m.category_id WHERE m.id = $1`,
			item.MenuItemID).Scan(&name, &tracksStock); err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("el producto no existe")
			}
			return err
		}
		if !tracksStock {
			continue
		}
		var display, warehouse float64
		if err := tx.QueryRow(`SELECT display_quantity, warehouse_quantity FROM menu_items
			WHERE id = $1 FOR UPDATE`, item.MenuItemID).Scan(&display, &warehouse); err != nil {
			return err
		}
		if display+warehouse < float64(item.Quantity) {
			return fmt.Errorf("no hay existencias suficientes de %s", name)
		}
		fromDisplay := display
		if fromDisplay > float64(item.Quantity) {
			fromDisplay = float64(item.Quantity)
		}
		fromWarehouse := float64(item.Quantity) - fromDisplay
		if _, err := tx.Exec(`UPDATE menu_items SET display_quantity = display_quantity - $1,
			warehouse_quantity = warehouse_quantity - $2, stock_quantity = stock_quantity - $1 - $2
			WHERE id = $3`, fromDisplay, fromWarehouse, item.MenuItemID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *stockRepository) Restore(items []domain.OrderItem) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, item := range items {
		if _, err := tx.Exec(`UPDATE menu_items m SET display_quantity = display_quantity + $1,
			stock_quantity = stock_quantity + $1 WHERE m.id = $2 AND EXISTS (
			SELECT 1 FROM categories c WHERE c.id = m.category_id AND c.tracks_stock = true
		)`, item.Quantity, item.MenuItemID); err != nil {
			return err
		}
	}
	return tx.Commit()
}
