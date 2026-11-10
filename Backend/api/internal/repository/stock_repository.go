package repository

import (
	"database/sql"
	"fmt"
	"sort"
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
	ReconcileOrderItems(previous, current []domain.OrderItem) error
	Reserve(items []domain.OrderItem) error
	Restore(items []domain.OrderItem) error
}

type stockRepository struct{ db *sql.DB }

func NewStockRepository(db *sql.DB) StockRepository { return &stockRepository{db: db} }

func (r *stockRepository) GetItems() ([]domain.StockItem, error) {
	rows, err := r.db.Query(`SELECT m.id, m.name, m.category_id, c.name, m.stock_quantity,
		m.warehouse_quantity, m.display_quantity FROM menu_items m
		JOIN categories c ON c.id = m.category_id
		WHERE (m.tracks_stock = true OR c.tracks_stock = true) AND m.is_available = true ORDER BY c.name, m.name`)
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
	result, err := r.db.Exec(`UPDATE menu_items SET warehouse_quantity = $1::numeric,
		display_quantity = $2::numeric, stock_quantity = $1::numeric + $2::numeric
		WHERE id = $3 AND (tracks_stock = true OR EXISTS (
			SELECT 1 FROM categories c WHERE c.id = menu_items.category_id AND c.tracks_stock = true
		))`, warehouse, display, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("el producto no existe o no pertenece a una categoría inventariable")
	}
	return nil
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
	if _, err := tx.Exec(`INSERT INTO inventory_receipts
		(id, receipt_number, received_by, supplier_name, notes, status, total)
		VALUES ($1, $2, $3, $4, $5, 'registered', 0)`,
		receiptID, receiptNumber, receivedBy, receipt.SupplierName, receipt.Notes); err != nil {
		return err
	}
	for _, line := range receipt.Lines {
		if line.Quantity <= 0 || line.UnitCost < 0 {
			return fmt.Errorf("cantidad y costo inválidos")
		}
		var name string
		var tracksStock bool
		if err := tx.QueryRow(`SELECT m.name, (m.tracks_stock OR c.tracks_stock) FROM menu_items m
			JOIN categories c ON c.id = m.category_id WHERE m.id = $1`,
			line.ItemID).Scan(&name, &tracksStock); err != nil {
			return err
		}
		if !tracksStock {
			return fmt.Errorf("%s no pertenece a una categoría inventariable", name)
		}
		lineTotal := line.Quantity * line.UnitCost
		total += lineTotal
		if _, err := tx.Exec(`UPDATE menu_items SET warehouse_quantity = warehouse_quantity + $1::numeric,
			stock_quantity = stock_quantity + $1::numeric WHERE id = $2`, line.Quantity, line.ItemID); err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO inventory_receipt_lines
			(id, receipt_id, item_name, menu_item_id, quantity, unit, unit_cost, line_total)
			VALUES ($1, $2, $3, $4, $5, 'unidad', $6, $7)`,
			uuid.New(), receiptID, name, line.ItemID, line.Quantity, line.UnitCost, lineTotal); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`UPDATE inventory_receipts SET total = $1::numeric WHERE id = $2`,
		total, receiptID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *stockRepository) SetQuantity(id uuid.UUID, quantity float64) error {
	result, err := r.db.Exec(`UPDATE menu_items SET warehouse_quantity = $1,
		display_quantity = 0, stock_quantity = $1
		WHERE id = $2 AND (tracks_stock = true OR EXISTS (
			SELECT 1 FROM categories c WHERE c.id = menu_items.category_id AND c.tracks_stock = true
		))`, quantity, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("el producto no existe o no pertenece a una categoría inventariable")
	}
	return nil
}

func (r *stockRepository) DeleteQuantity(id uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE menu_items SET warehouse_quantity = 0,
		display_quantity = 0, stock_quantity = 0
		WHERE id = $1 AND (tracks_stock = true OR EXISTS (
			SELECT 1 FROM categories c WHERE c.id = menu_items.category_id AND c.tracks_stock = true
		))`, id)
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
		if err := tx.QueryRow(`SELECT m.name, (m.tracks_stock OR c.tracks_stock) FROM menu_items m
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
			stock_quantity = stock_quantity + $1
			WHERE m.id = $2 AND (m.tracks_stock = true OR EXISTS (
				SELECT 1 FROM categories c WHERE c.id = m.category_id AND c.tracks_stock = true
			))`, item.Quantity, item.MenuItemID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *stockRepository) ReconcileOrderItems(previous, current []domain.OrderItem) error {
	oldQuantities := make(map[uuid.UUID]int)
	newQuantities := make(map[uuid.UUID]int)
	for _, item := range previous {
		oldQuantities[item.MenuItemID] += item.Quantity
	}
	for _, item := range current {
		newQuantities[item.MenuItemID] += item.Quantity
	}
	ids := make([]uuid.UUID, 0, len(oldQuantities)+len(newQuantities))
	seen := make(map[uuid.UUID]bool)
	for id := range oldQuantities {
		seen[id] = true
		ids = append(ids, id)
	}
	for id := range newQuantities {
		if !seen[id] {
			ids = append(ids, id)
		}
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i].String() < ids[j].String() })

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		delta := newQuantities[id] - oldQuantities[id]
		if delta == 0 {
			continue
		}
		var name string
		var tracksStock bool
		var display, warehouse float64
		if err := tx.QueryRow(`SELECT m.name, (m.tracks_stock OR c.tracks_stock),
			m.display_quantity, m.warehouse_quantity FROM menu_items m
			JOIN categories c ON c.id = m.category_id WHERE m.id = $1 FOR UPDATE`, id).
			Scan(&name, &tracksStock, &display, &warehouse); err != nil {
			return err
		}
		if !tracksStock {
			continue
		}
		if delta < 0 {
			amount := float64(-delta)
			if _, err := tx.Exec(`UPDATE menu_items SET display_quantity = display_quantity + $1,
				stock_quantity = stock_quantity + $1 WHERE id = $2`, amount, id); err != nil {
				return err
			}
			continue
		}
		required := float64(delta)
		if display+warehouse < required {
			return fmt.Errorf("no hay existencias suficientes de %s", name)
		}
		fromDisplay := display
		if fromDisplay > required {
			fromDisplay = required
		}
		if _, err := tx.Exec(`UPDATE menu_items SET display_quantity = display_quantity - $1,
			warehouse_quantity = warehouse_quantity - $2, stock_quantity = stock_quantity - $1 - $2
			WHERE id = $3`, fromDisplay, required-fromDisplay, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
