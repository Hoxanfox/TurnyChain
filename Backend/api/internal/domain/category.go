// =================================================================
// ARCHIVO 1: /internal/domain/category.go (NUEVO ARCHIVO)
// =================================================================
package domain

import "github.com/google/uuid"

type Category struct {
	ID   uuid.UUID `json:"id" db:"id"`
	Name string    `json:"name" db:"name"`
}