// =================================================================
// Printer Repository
// =================================================================
package repository

import (
	"backend/internal/domain"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PrinterRepository struct {
	db *sqlx.DB
}

func NewPrinterRepository(db *sqlx.DB) *PrinterRepository {
	return &PrinterRepository{db: db}
}

// GetAll obtiene todas las impresoras con info de su estación
func (r *PrinterRepository) GetAll() ([]domain.Printer, error) {
	var printers []domain.Printer
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		ORDER BY s.name, p.name
	`
	err := r.db.Select(&printers, query)
	return printers, err
}

// GetAllActive obtiene solo las impresoras activas
func (r *PrinterRepository) GetAllActive() ([]domain.Printer, error) {
	var printers []domain.Printer
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.is_active = true AND s.is_active = true
		ORDER BY s.name, p.name
	`
	err := r.db.Select(&printers, query)
	return printers, err
}

// GetByID obtiene una impresora por ID
func (r *PrinterRepository) GetByID(id uuid.UUID) (*domain.Printer, error) {
	var printer domain.Printer
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.id = $1
	`
	err := r.db.Get(&printer, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &printer, err
}

// GetByStationID obtiene todas las impresoras de una estación específica
func (r *PrinterRepository) GetByStationID(stationID uuid.UUID) ([]domain.Printer, error) {
	var printers []domain.Printer
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.station_id = $1 AND p.is_active = true
		ORDER BY p.name
	`
	err := r.db.Select(&printers, query, stationID)
	return printers, err
}

// GetByStationIDs obtiene todas las impresoras activas de múltiples estaciones
func (r *PrinterRepository) GetByStationIDs(stationIDs []uuid.UUID) ([]domain.Printer, error) {
	if len(stationIDs) == 0 {
		return []domain.Printer{}, nil
	}

	var printers []domain.Printer
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.station_id = ANY($1) AND p.is_active = true AND s.is_active = true
		ORDER BY s.name, p.name
	`
	err := r.db.Select(&printers, query, stationIDs)
	return printers, err
}

// Create crea una nueva impresora
func (r *PrinterRepository) Create(req domain.CreatePrinterRequest) (*domain.Printer, error) {
	var printer domain.Printer
	query := `
		INSERT INTO printers (name, ip_address, port, printer_type, station_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, ip_address, port, printer_type, station_id, is_active, created_at
	`
	err := r.db.Get(&printer, query, req.Name, req.IPAddress, req.Port, req.PrinterType, req.StationID)
	if err != nil {
		return nil, err
	}

	// Obtener el nombre de la estación
	printerWithStation, err := r.GetByID(printer.ID)
	if err != nil {
		return &printer, nil // Devolver el printer sin station_name si falla el join
	}

	return printerWithStation, nil
}

// Update actualiza una impresora existente
func (r *PrinterRepository) Update(id uuid.UUID, req domain.UpdatePrinterRequest) error {
	query := `
		UPDATE printers
		SET name = COALESCE(NULLIF($1, ''), name),
		    ip_address = COALESCE(NULLIF($2, ''), ip_address),
		    port = COALESCE($3, port),
		    printer_type = COALESCE($4, printer_type),
		    station_id = COALESCE($5, station_id),
		    is_active = COALESCE($6, is_active)
		WHERE id = $7
	`
	result, err := r.db.Exec(query, req.Name, req.IPAddress, req.Port, req.PrinterType, req.StationID, req.IsActive, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("printer not found")
	}

	return nil
}

// Delete elimina una impresora (soft delete)
func (r *PrinterRepository) Delete(id uuid.UUID) error {
	query := `UPDATE printers SET is_active = false WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("printer not found")
	}

	return nil
}

