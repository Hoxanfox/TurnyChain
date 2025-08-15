// =================================================================
// ARCHIVO 4: /internal/domain/menu_item.go (CORREGIDO Y SIMPLIFICADO)
// =================================================================
package domain

import "github.com/google/uuid"

type MenuItem struct {
	ID            uuid.UUID       `json:"id" db:"id"`
	Name          string          `json:"name" db:"name"`
	Description   string          `json:"description" db:"description"`
	Price         float64         `json:"price" db:"price"`
	CategoryID    uuid.UUID       `json:"category_id" db:"category_id"`
	IsAvailable   bool            `json:"is_available" db:"is_available"`
	Ingredients   []Ingredient    `json:"ingredients,omitempty"`
	Accompaniments []Accompaniment `json:"accompaniments,omitempty"`
}