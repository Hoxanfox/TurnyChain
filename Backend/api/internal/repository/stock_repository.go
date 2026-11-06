package repository

import (
	"database/sql"
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type StockRepository interface {
	GetItems() ([]domain.StockItem, error)
	SetQuantity(id uuid.UUID, quantity float64) error
	DeleteQuantity(id uuid.UUID) error
	Reserve(items []domain.OrderItem) error
	Restore(items []domain.OrderItem) error
}

type stockRepository struct{ db *sql.DB }

func NewStockRepository(db *sql.DB) StockRepository { return &stockRepository{db: db} }

func (r *stockRepository) GetItems() ([]domain.StockItem, error) {
	rows, err := r.db.Query(`
		SELECT m.id, m.name, m.category_id, c.name, m.stock_quantity
		FROM menu_items m
		JOIN categories c ON c.id = m.category_id
		WHERE c.tracks_stock = true AND m.is_available = true
		ORDER BY c.name, m.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.StockItem, 0)
	for rows.Next() {
		var item domain.StockItem
		if err := rows.Scan(&item.ID, &item.Name, &item.CategoryID, &item.CategoryName, &item.Quantity); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *stockRepository) SetQuantity(id uuid.UUID, quantity float64) error {
	_, err := r.db.Exec(`
		UPDATE menu_items SET stock_quantity = $1
		WHERE id = $2 AND EXISTS (
			SELECT 1 FROM categories c WHERE c.id = menu_items.category_id AND c.tracks_stock = true
		)`, quantity, id)
	return err
}

func (r *stockRepository) DeleteQuantity(id uuid.UUID) error {
	_, err := r.db.Exec(`
		UPDATE menu_items SET stock_quantity = 0
		WHERE id = $1 AND EXISTS (
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
		if err := tx.QueryRow(`
			SELECT m.name, c.tracks_stock
			FROM menu_items m
			JOIN categories c ON c.id = m.category_id
			WHERE m.id = $1`, item.MenuItemID).Scan(&name, &tracksStock); err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("el producto no existe")
			}
			return err
		}
		if !tracksStock {
			continue
		}
		result, err := tx.Exec(`
			UPDATE menu_items m SET stock_quantity = m.stock_quantity - $1
			WHERE m.id = $2 AND m.stock_quantity >= $1
			AND EXISTS (SELECT 1 FROM categories c WHERE c.id = m.category_id AND c.tracks_stock = true)`,
			item.Quantity, item.MenuItemID)
		if err != nil {
			return err
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if affected == 0 {
			return fmt.Errorf("no hay existencias suficientes de %s", name)
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
		if _, err := tx.Exec(`
			UPDATE menu_items m SET stock_quantity = stock_quantity + $1
			WHERE m.id = $2 AND EXISTS (
				SELECT 1 FROM categories c WHERE c.id = m.category_id AND c.tracks_stock = true
			)`, item.Quantity, item.MenuItemID); err != nil {
			return err
		}
	}
	return tx.Commit()
}
