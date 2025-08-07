// =================================================================
// ARCHIVO 4: /internal/repository/menu_repository.go (ACTUALIZADO)
// =================================================================
package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type MenuRepository interface {
	CreateMenuItem(item *domain.MenuItem) (*domain.MenuItem, error)
	GetMenuItems() ([]domain.MenuItem, error)
	UpdateMenuItem(item *domain.MenuItem) (*domain.MenuItem, error)
	DeleteMenuItem(itemID uuid.UUID) error
}

type menuRepository struct { db *sql.DB }

func NewMenuRepository(db *sql.DB) MenuRepository {
	return &menuRepository{db: db}
}

func (r *menuRepository) CreateMenuItem(item *domain.MenuItem) (*domain.MenuItem, error) {
	item.ID = uuid.New()
	query := `INSERT INTO menu_items (id, name, description, price, category, is_available, modifiers) 
			  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`
	err := r.db.QueryRow(query, item.ID, item.Name, item.Description, item.Price, item.Category, item.IsAvailable, item.Modifiers).Scan(&item.ID)
	return item, err
}

func (r *menuRepository) GetMenuItems() ([]domain.MenuItem, error) {
	query := "SELECT id, name, description, price, category, is_available, modifiers FROM menu_items WHERE is_available = true"
	rows, err := r.db.Query(query)
	if err != nil { return nil, err }
	defer rows.Close()

	var items []domain.MenuItem
	for rows.Next() {
		var item domain.MenuItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.Price, &item.Category, &item.IsAvailable, &item.Modifiers); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *menuRepository) UpdateMenuItem(item *domain.MenuItem) (*domain.MenuItem, error) {
	query := `UPDATE menu_items SET name = $1, description = $2, price = $3, category = $4, modifiers = $5 
              WHERE id = $6 RETURNING id, name, description, price, category, is_available, modifiers`
	err := r.db.QueryRow(query, item.Name, item.Description, item.Price, item.Category, item.Modifiers, item.ID).Scan(
		&item.ID, &item.Name, &item.Description, &item.Price, &item.Category, &item.IsAvailable, &item.Modifiers,
	)
	return item, err
}

func (r *menuRepository) DeleteMenuItem(itemID uuid.UUID) error {
	query := "UPDATE menu_items SET is_available = false WHERE id = $1"
	_, err := r.db.Exec(query, itemID)
	return err
}