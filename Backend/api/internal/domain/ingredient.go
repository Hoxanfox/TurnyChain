// =================================================================
// ARCHIVO 2: /internal/domain/ingredient.go (NUEVO ARCHIVO)
// =================================================================
package domain

import "github.com/google/uuid"

type Ingredient struct {
	ID   uuid.UUID `json:"id" db:"id"`
	Name string    `json:"name" db:"name"`
}