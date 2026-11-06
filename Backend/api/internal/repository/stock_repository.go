package repository

import (
	"database/sql"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type StockRepository interface {
	GetItems() ([]domain.StockItem, error)
	SetQuantity(id uuid.UUID, quantity float64) error
	DeleteQuantity(id uuid.UUID) error
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
