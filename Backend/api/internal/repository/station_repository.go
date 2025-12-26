// =================================================================
// Station Repository
// =================================================================
package repository

import (
	"backend/internal/domain"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type StationRepository struct {
	db *sqlx.DB
}

func NewStationRepository(db *sqlx.DB) *StationRepository {
	return &StationRepository{db: db}
}

// GetAll obtiene todas las estaciones
func (r *StationRepository) GetAll() ([]domain.Station, error) {
	var stations []domain.Station
	query := `SELECT id, name, description, is_active, created_at FROM stations ORDER BY name`
	err := r.db.Select(&stations, query)
	return stations, err
}

// GetAllActive obtiene solo las estaciones activas
func (r *StationRepository) GetAllActive() ([]domain.Station, error) {
	var stations []domain.Station
	query := `SELECT id, name, description, is_active, created_at FROM stations WHERE is_active = true ORDER BY name`
	err := r.db.Select(&stations, query)
	return stations, err
}

// GetByID obtiene una estación por ID
func (r *StationRepository) GetByID(id uuid.UUID) (*domain.Station, error) {
	var station domain.Station
	query := `SELECT id, name, description, is_active, created_at FROM stations WHERE id = $1`
	err := r.db.Get(&station, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &station, err
}

// Create crea una nueva estación
func (r *StationRepository) Create(req domain.CreateStationRequest) (*domain.Station, error) {
	var station domain.Station
	query := `
		INSERT INTO stations (name, description)
		VALUES ($1, $2)
		RETURNING id, name, description, is_active, created_at
	`
	err := r.db.Get(&station, query, req.Name, req.Description)
	return &station, err
}

// Update actualiza una estación existente
func (r *StationRepository) Update(id uuid.UUID, req domain.UpdateStationRequest) error {
	query := `
		UPDATE stations
		SET name = COALESCE(NULLIF($1, ''), name),
		    description = COALESCE(NULLIF($2, ''), description),
		    is_active = COALESCE($3, is_active)
		WHERE id = $4
	`
	result, err := r.db.Exec(query, req.Name, req.Description, req.IsActive, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("station not found")
	}

	return nil
}

// Delete elimina una estación (soft delete)
func (r *StationRepository) Delete(id uuid.UUID) error {
	query := `UPDATE stations SET is_active = false WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("station not found")
	}

	return nil
}

// GetStationsByCategoryIDs obtiene las estaciones asociadas a un conjunto de categorías
func (r *StationRepository) GetStationsByCategoryIDs(categoryIDs []uuid.UUID) ([]domain.Station, error) {
	if len(categoryIDs) == 0 {
		return []domain.Station{}, nil
	}

	query := `
		SELECT DISTINCT s.id, s.name, s.description, s.is_active, s.created_at
		FROM stations s
		INNER JOIN categories c ON c.station_id = s.id
		WHERE c.id = ANY($1) AND s.is_active = true
		ORDER BY s.name
	`

	var stations []domain.Station
	err := r.db.Select(&stations, query, categoryIDs)
	return stations, err
}

