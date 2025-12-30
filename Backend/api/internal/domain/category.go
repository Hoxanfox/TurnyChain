// =================================================================
// ARCHIVO 1: /internal/domain/category.go (ACTUALIZADO)
// =================================================================
package domain

import "github.com/google/uuid"

type Category struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	StationID   *uuid.UUID `json:"station_id,omitempty" db:"station_id"`
	StationName *string    `json:"station_name,omitempty" db:"station_name"` // Join con stations (nullable)
}
