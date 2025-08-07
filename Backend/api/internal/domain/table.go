// =================================================================
// ARCHIVO 1: /internal/domain/table.go (NUEVO ARCHIVO)
// =================================================================
package domain

import "github.com/google/uuid"

type Table struct {
	ID          uuid.UUID `json:"id" db:"id"`
	TableNumber int       `json:"table_number" db:"table_number"`
	IsActive    bool      `json:"is_active" db:"is_active"`
}
