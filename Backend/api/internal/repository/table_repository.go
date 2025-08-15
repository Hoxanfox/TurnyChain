// =================================================================
// ARCHIVO 2: /internal/repository/table_repository.go (ACTUALIZADO)
// Propósito: Añadir una función para buscar una mesa por su número.
// =================================================================
package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type TableRepository interface {
	Create(tableNumber int) (*domain.Table, error)
	GetAll(onlyActive bool) ([]domain.Table, error)
	GetByNumber(tableNumber int) (*domain.Table, error) // <-- NUEVA FUNCIÓN
}

type tableRepository struct { db *sql.DB }

func NewTableRepository(db *sql.DB) TableRepository {
	return &tableRepository{db: db}
}

func (r *tableRepository) Create(tableNumber int) (*domain.Table, error) {
	table := &domain.Table{ID: uuid.New(), TableNumber: tableNumber, IsActive: true}
	query := "INSERT INTO tables (id, table_number, is_active) VALUES ($1, $2, $3) RETURNING id, is_active"
	err := r.db.QueryRow(query, table.ID, table.TableNumber, table.IsActive).Scan(&table.ID, &table.IsActive)
	return table, err
}

func (r *tableRepository) GetAll(onlyActive bool) ([]domain.Table, error) {
	query := "SELECT id, table_number, is_active FROM tables"
	if onlyActive {
		query += " WHERE is_active = true"
	}
	rows, err := r.db.Query(query)
	if err != nil { return nil, err }
	defer rows.Close()
	
	// CORRECCIÓN: Inicializamos la slice.
	tables := make([]domain.Table, 0)
	for rows.Next() {
		var table domain.Table
		if err := rows.Scan(&table.ID, &table.TableNumber, &table.IsActive); err != nil {
			return nil, err
		}
		tables = append(tables, table)
	}
	return tables, nil
}

// GetByNumber busca una mesa activa por su número.
func (r *tableRepository) GetByNumber(tableNumber int) (*domain.Table, error) {
	table := &domain.Table{}
	query := "SELECT id, table_number, is_active FROM tables WHERE table_number = $1 AND is_active = true"
	err := r.db.QueryRow(query, tableNumber).Scan(&table.ID, &table.TableNumber, &table.IsActive)
	return table, err
}