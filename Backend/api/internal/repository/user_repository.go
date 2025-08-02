// =================================================================
// ARCHIVO 2: /internal/repository/user_repository.go (ACTUALIZADO)
// =================================================================
package repository

import (
	"database/sql"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type UserRepository interface {
	CreateUser(user *domain.User) (*domain.User, error)
	GetUserByUsername(username string) (*domain.User, error)
	GetUsers() ([]domain.User, error)
	UpdateUser(user *domain.User) (*domain.User, error)
	DeleteUser(userID uuid.UUID) error // La interfaz no cambia
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) CreateUser(user *domain.User) (*domain.User, error) {
	user.ID = uuid.New()
	query := "INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)"
	_, err := r.db.Exec(query, user.ID, user.Username, user.PasswordHash, user.Role)
	if err != nil {
		return nil, err
	}
	user.PasswordHash = ""
	return user, nil
}

// GetUserByUsername ahora solo busca usuarios activos.
func (r *userRepository) GetUserByUsername(username string) (*domain.User, error) {
	user := &domain.User{}
	query := "SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1 AND is_active = true"
	err := r.db.QueryRow(query, username).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.Role, &user.IsActive)
	return user, err
}

// GetUsers ahora solo devuelve usuarios activos.
func (r *userRepository) GetUsers() ([]domain.User, error) {
    query := "SELECT id, username, role, is_active FROM users WHERE is_active = true"
    rows, err := r.db.Query(query)
    if err != nil { return nil, err }
    defer rows.Close()

    var users []domain.User
    for rows.Next() {
        var user domain.User
        if err := rows.Scan(&user.ID, &user.Username, &user.Role, &user.IsActive); err != nil {
            return nil, err
        }
        users = append(users, user)
    }
    return users, nil
}

// UpdateUser actualiza un usuario en la base de datos. // <-- NUEVO
func (r *userRepository) UpdateUser(user *domain.User) (*domain.User, error) {
	query := "UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING id, username, role"
	err := r.db.QueryRow(query, user.Username, user.Role, user.ID).Scan(&user.ID, &user.Username, &user.Role)
	if err != nil {
		return nil, err
	}
	user.PasswordHash = ""
	return user, nil
}

// DeleteUser ahora hace un "soft delete" actualizando la columna is_active.
func (r *userRepository) DeleteUser(userID uuid.UUID) error {
	query := "UPDATE users SET is_active = false WHERE id = $1"
	_, err := r.db.Exec(query, userID)
	return err
}
