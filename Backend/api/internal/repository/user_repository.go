// =================================================================
// ARCHIVO 1: /internal/repository/user_repository.go (ACTUALIZADO)
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
	UpdateUser(user *domain.User) (*domain.User, error) // <-- NUEVO
	DeleteUser(userID uuid.UUID) error               // <-- NUEVO
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

func (r *userRepository) GetUserByUsername(username string) (*domain.User, error) {
	user := &domain.User{}
	query := "SELECT id, username, password_hash, role FROM users WHERE username = $1"
	err := r.db.QueryRow(query, username).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.Role)
	return user, err
}

func (r *userRepository) GetUsers() ([]domain.User, error) {
    query := "SELECT id, username, role FROM users"
    rows, err := r.db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []domain.User
    for rows.Next() {
        var user domain.User
        if err := rows.Scan(&user.ID, &user.Username, &user.Role); err != nil {
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

// DeleteUser elimina un usuario de la base de datos. // <-- NUEVO
func (r *userRepository) DeleteUser(userID uuid.UUID) error {
	query := "DELETE FROM users WHERE id = $1"
	_, err := r.db.Exec(query, userID)
	return err
}
