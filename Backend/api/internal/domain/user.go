// =================================================================
// ARCHIVO 1: /internal/domain/user.go (NUEVO ARCHIVO)
// =================================================================
package domain

import "github.com/google/uuid"

type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	IsActive     bool      `json:"is_active" db:"is_active"`
}