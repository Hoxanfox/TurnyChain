// =================================================================
// Station Repository
// =================================================================
package repository

import (
	"database/sql"
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type StationRepository struct {
	db *sql.DB
}

func NewStationRepository(db *sql.DB) *StationRepository {
	return &StationRepository{db: db}
}

// GetAll obtiene todas las estaciones
func (r *StationRepository) GetAll() ([]domain.Station, error) {
	query := `SELECT id, name, description, is_active, created_at FROM stations ORDER BY name`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stations := make([]domain.Station, 0)
	for rows.Next() {
		var station domain.Station
		var description sql.NullString
		if err := rows.Scan(&station.ID, &station.Name, &description, &station.IsActive, &station.CreatedAt); err != nil {
			return nil, err
		}
		if description.Valid {
			station.Description = description.String
		}
		stations = append(stations, station)
	}
	return stations, nil
}

// GetAllActive obtiene solo las estaciones activas
func (r *StationRepository) GetAllActive() ([]domain.Station, error) {
	query := `SELECT id, name, description, is_active, created_at FROM stations WHERE is_active = true ORDER BY name`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stations := make([]domain.Station, 0)
	for rows.Next() {
		var station domain.Station
		var description sql.NullString
		if err := rows.Scan(&station.ID, &station.Name, &description, &station.IsActive, &station.CreatedAt); err != nil {
			return nil, err
		}
		if description.Valid {
			station.Description = description.String
		}
		stations = append(stations, station)
	}
	return stations, nil
}

// GetByID obtiene una estación por ID
func (r *StationRepository) GetByID(id uuid.UUID) (*domain.Station, error) {
	var station domain.Station
	var description sql.NullString
	query := `SELECT id, name, description, is_active, created_at FROM stations WHERE id = $1`
	err := r.db.QueryRow(query, id).Scan(&station.ID, &station.Name, &description, &station.IsActive, &station.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if description.Valid {
		station.Description = description.String
	}
	return &station, nil
}

// Create crea una nueva estación
func (r *StationRepository) Create(req domain.CreateStationRequest) (*domain.Station, error) {
	var station domain.Station
	query := `
		INSERT INTO stations (name, description)
		VALUES ($1, $2)
		RETURNING id, name, description, is_active, created_at
	`
	var description sql.NullString
	err := r.db.QueryRow(query, req.Name, req.Description).Scan(&station.ID, &station.Name, &description, &station.IsActive, &station.CreatedAt)
	if err != nil {
		return nil, err
	}
	if description.Valid {
		station.Description = description.String
	}
	return &station, nil
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

	// Construir query con placeholders dinámicos
	query := `
		SELECT DISTINCT s.id, s.name, s.description, s.is_active, s.created_at
		FROM stations s
		INNER JOIN categories c ON c.station_id = s.id
		WHERE s.is_active = true AND c.id IN (`

	params := make([]interface{}, len(categoryIDs))
	for i, id := range categoryIDs {
		if i > 0 {
			query += ", "
		}
		query += fmt.Sprintf("$%d", i+1)
		params[i] = id
	}
	query += `) ORDER BY s.name`

	rows, err := r.db.Query(query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stations := make([]domain.Station, 0)
	for rows.Next() {
		var station domain.Station
		var description sql.NullString
		if err := rows.Scan(&station.ID, &station.Name, &description, &station.IsActive, &station.CreatedAt); err != nil {
			return nil, err
		}
		if description.Valid {
			station.Description = description.String
		}
		stations = append(stations, station)
	}
	return stations, nil
}
