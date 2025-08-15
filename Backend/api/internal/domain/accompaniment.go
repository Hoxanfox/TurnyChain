// =================================================================
// ARCHIVO 3: /internal/domain/accompaniment.go (NUEVO ARCHIVO)
// =================================================================
package domain

import "github.com/google/uuid"

type Accompaniment struct {
	ID    uuid.UUID `json:"id" db:"id"`
	Name  string    `json:"name" db:"name"`
	Price float64   `json:"price" db:"price"`
}