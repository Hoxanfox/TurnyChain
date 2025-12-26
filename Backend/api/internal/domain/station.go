// =================================================================
// Station Domain Model
// =================================================================
package domain

import (
	"time"

	"github.com/google/uuid"
)

// Station representa una estación de preparación (Cocina, Bar, Parrilla, etc.)
type Station struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description,omitempty" db:"description"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// CreateStationRequest es el payload para crear una estación
type CreateStationRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateStationRequest es el payload para actualizar una estación
type UpdateStationRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

