// =================================================================
// ARCHIVO 2: /internal/service/menu_service.go (ACTUALIZADO)
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type MenuService interface {
	CreateMenuItem(name, description, category string, price float64) (*domain.MenuItem, error)
	GetMenuItems() ([]domain.MenuItem, error)
	UpdateMenuItem(id uuid.UUID, name, description, category string, price float64) (*domain.MenuItem, error) // <-- NUEVO
	DeleteMenuItem(id uuid.UUID) error                                                                     // <-- NUEVO
}

type menuService struct {
	menuRepo repository.MenuRepository
}

func NewMenuService(repo repository.MenuRepository) MenuService {
	return &menuService{menuRepo: repo}
}

func (s *menuService) CreateMenuItem(name, description, category string, price float64) (*domain.MenuItem, error) {
	item := &domain.MenuItem{
		Name:        name,
		Description: description,
		Price:       price,
		Category:    category,
	}
	return s.menuRepo.CreateMenuItem(item)
}

func (s *menuService) GetMenuItems() ([]domain.MenuItem, error) {
	return s.menuRepo.GetMenuItems()
}

// UpdateMenuItem actualiza un ítem del menú. // <-- NUEVO
func (s *menuService) UpdateMenuItem(id uuid.UUID, name, description, category string, price float64) (*domain.MenuItem, error) {
	item := &domain.MenuItem{
		ID:          id,
		Name:        name,
		Description: description,
		Price:       price,
		Category:    category,
	}
	return s.menuRepo.UpdateMenuItem(item)
}

// DeleteMenuItem elimina un ítem del menú. // <-- NUEVO
func (s *menuService) DeleteMenuItem(id uuid.UUID) error {
	return s.menuRepo.DeleteMenuItem(id)
}