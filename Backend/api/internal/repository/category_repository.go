// =================================================================
// ARCHIVO 5: /internal/repository/category_repository.go
// =================================================================
package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type CategoryRepository interface {
	Create(name string, stationID *uuid.UUID, tracksStock bool) (*domain.Category, error)
	GetAll() ([]domain.Category, error)
	Update(id uuid.UUID, name string, stationID *uuid.UUID, tracksStock bool) (*domain.Category, error)
	Delete(id uuid.UUID) error
}

type categoryRepository struct{ db *sql.DB }

func NewCategoryRepository(db *sql.DB) CategoryRepository { return &categoryRepository{db: db} }

func (r *categoryRepository) Create(name string, stationID *uuid.UUID, tracksStock bool) (*domain.Category, error) {
	cat := &domain.Category{ID: uuid.New(), Name: name, StationID: stationID, TracksStock: tracksStock}
	query := "INSERT INTO categories (id, name, station_id, tracks_stock) VALUES ($1, $2, $3, $4) RETURNING id"
	err := r.db.QueryRow(query, cat.ID, cat.Name, cat.StationID, cat.TracksStock).Scan(&cat.ID)
	return cat, err
}

func (r *categoryRepository) GetAll() ([]domain.Category, error) {
	query := `
		SELECT c.id, c.name, c.station_id, s.name as station_name, c.tracks_stock
		FROM categories c
		LEFT JOIN stations s ON s.id = c.station_id
		ORDER BY c.name
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// CORRECCIÓN: Inicializamos la slice para que nunca sea nil.
	categories := make([]domain.Category, 0)
	for rows.Next() {
		var cat domain.Category
		if err := rows.Scan(&cat.ID, &cat.Name, &cat.StationID, &cat.StationName, &cat.TracksStock); err != nil {
			return nil, err
		}
		categories = append(categories, cat)
	}
	return categories, nil
}

func (r *categoryRepository) Update(id uuid.UUID, name string, stationID *uuid.UUID, tracksStock bool) (*domain.Category, error) {
	cat := &domain.Category{ID: id, Name: name, StationID: stationID, TracksStock: tracksStock}
	query := `
		UPDATE categories
		SET name = $1, station_id = $2, tracks_stock = $3
		WHERE id = $4
		RETURNING id, name, station_id
	`
	err := r.db.QueryRow(query, cat.Name, cat.StationID, cat.TracksStock, cat.ID).Scan(&cat.ID, &cat.Name, &cat.StationID)
	return cat, err
}

func (r *categoryRepository) Delete(id uuid.UUID) error {
	query := "DELETE FROM categories WHERE id = $1"
	_, err := r.db.Exec(query, id)
	return err
}
