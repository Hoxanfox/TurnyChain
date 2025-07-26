// =================================================================
// ARCHIVO 1: /internal/domain/user.go
// Propósito: Definir el modelo de datos.
// =================================================================
package domain

import "github.com/google/uuid"

// User define la estructura de un usuario en nuestro sistema.
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
}