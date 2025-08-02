// =================================================================
// ARCHIVO 1: /internal/repository/menu_repository.go (ACTUALIZADO)
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
	UpdateMenuItem(item *domain.MenuItem) (*domain.MenuItem, error) // <-- NUEVO
	DeleteMenuItem(itemID uuid.UUID) error                       // <-- NUEVO
}

type menuRepository struct {
	db *sql.DB
}

func NewMenuRepository(db *sql.DB) MenuRepository {
	return &menuRepository{db: db}
}

func (r *menuRepository) CreateMenuItem(item *domain.MenuItem) (*domain.MenuItem, error) {
	item.ID = uuid.New()
	query := `INSERT INTO menu_items (id, name, description, price, category) VALUES ($1, $2, $3, $4, $5) RETURNING id`
	err := r.db.QueryRow(query, item.ID, item.Name, item.Description, item.Price, item.Category).Scan(&item.ID)
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (r *menuRepository) GetMenuItems() ([]domain.MenuItem, error) {
	query := "SELECT id, name, description, price, category FROM menu_items"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.MenuItem
	for rows.Next() {
		var item domain.MenuItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Description, &item.Price, &item.Category); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

// UpdateMenuItem actualiza un ítem del menú en la base de datos. // <-- NUEVO
func (r *menuRepository) UpdateMenuItem(item *domain.MenuItem) (*domain.MenuItem, error) {
	query := `UPDATE menu_items SET name = $1, description = $2, price = $3, category = $4 
              WHERE id = $5 
              RETURNING id, name, description, price, category`
	err := r.db.QueryRow(query, item.Name, item.Description, item.Price, item.Category, item.ID).Scan(
		&item.ID, &item.Name, &item.Description, &item.Price, &item.Category,
	)
	if err != nil {
		return nil, err
	}
	return item, nil
}

// DeleteMenuItem elimina un ítem del menú de la base de datos. // <-- NUEVO
func (r *menuRepository) DeleteMenuItem(itemID uuid.UUID) error {
	query := "DELETE FROM menu_items WHERE id = $1"
	_, err := r.db.Exec(query, itemID)
	return err
}