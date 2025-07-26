// =================================================================
// ARCHIVO 2: /internal/service/user_service.go (ACTUALIZADO)
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	CreateUser(username, password, role string) (*domain.User, error)
    GetUsers() ([]domain.User, error)
	UpdateUser(id uuid.UUID, username, role string) (*domain.User, error) // <-- NUEVO
	DeleteUser(id uuid.UUID) error                                     // <-- NUEVO
}

type userService struct {
	userRepo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{userRepo: repo}
}

func (s *userService) CreateUser(username, password, role string) (*domain.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &domain.User{
		Username:     username,
		PasswordHash: string(hashedPassword),
		Role:         role,
	}
	return s.userRepo.CreateUser(user)
}

func (s *userService) GetUsers() ([]domain.User, error) {
    return s.userRepo.GetUsers()
}

// UpdateUser actualiza los datos de un usuario. // <-- NUEVO
func (s *userService) UpdateUser(id uuid.UUID, username, role string) (*domain.User, error) {
	user := &domain.User{
		ID:       id,
		Username: username,
		Role:     role,
	}
	return s.userRepo.UpdateUser(user)
}

// DeleteUser elimina un usuario. // <-- NUEVO
func (s *userService) DeleteUser(id uuid.UUID) error {
	return s.userRepo.DeleteUser(id)
}
