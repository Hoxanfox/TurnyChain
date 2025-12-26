// =================================================================
// Printer Repository
// =================================================================
package repository

import (
	"database/sql"
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type PrinterRepository struct {
	db *sql.DB
}

func NewPrinterRepository(db *sql.DB) *PrinterRepository {
	return &PrinterRepository{db: db}
}

// GetAll obtiene todas las impresoras con info de su estación
func (r *PrinterRepository) GetAll() ([]domain.Printer, error) {
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		ORDER BY s.name, p.name
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	printers := make([]domain.Printer, 0)
	for rows.Next() {
		var printer domain.Printer
		var stationName sql.NullString
		if err := rows.Scan(&printer.ID, &printer.Name, &printer.IPAddress, &printer.Port, &printer.PrinterType, &printer.StationID, &stationName, &printer.IsActive, &printer.CreatedAt); err != nil {
			return nil, err
		}
		if stationName.Valid {
			printer.StationName = stationName.String
		}
		printers = append(printers, printer)
	}
	return printers, nil
}

// GetAllActive obtiene solo las impresoras activas
func (r *PrinterRepository) GetAllActive() ([]domain.Printer, error) {
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.is_active = true AND s.is_active = true
		ORDER BY s.name, p.name
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	printers := make([]domain.Printer, 0)
	for rows.Next() {
		var printer domain.Printer
		var stationName sql.NullString
		if err := rows.Scan(&printer.ID, &printer.Name, &printer.IPAddress, &printer.Port, &printer.PrinterType, &printer.StationID, &stationName, &printer.IsActive, &printer.CreatedAt); err != nil {
			return nil, err
		}
		if stationName.Valid {
			printer.StationName = stationName.String
		}
		printers = append(printers, printer)
	}
	return printers, nil
}

// GetByID obtiene una impresora por ID
func (r *PrinterRepository) GetByID(id uuid.UUID) (*domain.Printer, error) {
	var printer domain.Printer
	var stationName sql.NullString
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&printer.ID, &printer.Name, &printer.IPAddress, &printer.Port, &printer.PrinterType, &printer.StationID, &stationName, &printer.IsActive, &printer.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if stationName.Valid {
		printer.StationName = stationName.String
	}
	return &printer, nil
}

// GetByStationID obtiene todas las impresoras de una estación específica
func (r *PrinterRepository) GetByStationID(stationID uuid.UUID) ([]domain.Printer, error) {
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.station_id = $1 AND p.is_active = true
		ORDER BY p.name
	`
	rows, err := r.db.Query(query, stationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	printers := make([]domain.Printer, 0)
	for rows.Next() {
		var printer domain.Printer
		var stationName sql.NullString
		if err := rows.Scan(&printer.ID, &printer.Name, &printer.IPAddress, &printer.Port, &printer.PrinterType, &printer.StationID, &stationName, &printer.IsActive, &printer.CreatedAt); err != nil {
			return nil, err
		}
		if stationName.Valid {
			printer.StationName = stationName.String
		}
		printers = append(printers, printer)
	}
	return printers, nil
}

// GetByStationIDs obtiene todas las impresoras activas de múltiples estaciones
func (r *PrinterRepository) GetByStationIDs(stationIDs []uuid.UUID) ([]domain.Printer, error) {
	if len(stationIDs) == 0 {
		return []domain.Printer{}, nil
	}

	// Construir query con placeholders dinámicos
	query := `
		SELECT p.id, p.name, p.ip_address, p.port, p.printer_type, 
		       p.station_id, s.name as station_name, p.is_active, p.created_at
		FROM printers p
		INNER JOIN stations s ON s.id = p.station_id
		WHERE p.is_active = true AND s.is_active = true AND p.station_id IN (`

	params := make([]interface{}, len(stationIDs))
	for i, id := range stationIDs {
		if i > 0 {
			query += ", "
		}
		query += fmt.Sprintf("$%d", i+1)
		params[i] = id
	}
	query += `) ORDER BY s.name, p.name`

	rows, err := r.db.Query(query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	printers := make([]domain.Printer, 0)
	for rows.Next() {
		var printer domain.Printer
		var stationName sql.NullString
		if err := rows.Scan(&printer.ID, &printer.Name, &printer.IPAddress, &printer.Port, &printer.PrinterType, &printer.StationID, &stationName, &printer.IsActive, &printer.CreatedAt); err != nil {
			return nil, err
		}
		if stationName.Valid {
			printer.StationName = stationName.String
		}
		printers = append(printers, printer)
	}
	return printers, nil
}

// Create crea una nueva impresora
func (r *PrinterRepository) Create(req domain.CreatePrinterRequest) (*domain.Printer, error) {
	var printer domain.Printer
	query := `
		INSERT INTO printers (name, ip_address, port, printer_type, station_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, ip_address, port, printer_type, station_id, is_active, created_at
	`
	err := r.db.QueryRow(query, req.Name, req.IPAddress, req.Port, req.PrinterType, req.StationID).Scan(&printer.ID, &printer.Name, &printer.IPAddress, &printer.Port, &printer.PrinterType, &printer.StationID, &printer.IsActive, &printer.CreatedAt)
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
