// =================================================================
// ARCHIVO 1: /internal/service/menu_service.go (ACTUALIZADO)
// Propósito: Notificar al hub después de cada operación del menú.
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

type MenuService interface {
	CreateMenuItem(name, description, category string, price float64, modifiers domain.Modifiers) (*domain.MenuItem, error)
	GetMenuItems() ([]domain.MenuItem, error)
	UpdateMenuItem(id uuid.UUID, name, description, category string, price float64, modifiers domain.Modifiers) (*domain.MenuItem, error)
	DeleteMenuItem(id uuid.UUID) error
}

type menuService struct {
	menuRepo repository.MenuRepository
	wsHub    *wshub.Hub // <-- NUEVA DEPENDENCIA
}

func NewMenuService(repo repository.MenuRepository, wsHub *wshub.Hub) MenuService { // <-- ACTUALIZADO
	return &menuService{
		menuRepo: repo,
		wsHub:    wsHub, // <-- NUEVA DEPENDENCIA
	}
}

func (s *menuService) CreateMenuItem(name, description, category string, price float64, modifiers domain.Modifiers) (*domain.MenuItem, error) {
	item := &domain.MenuItem{
		Name:        name,
		Description: description,
		Price:       price,
		Category:    category,
		IsAvailable: true,
		Modifiers:   modifiers,
	}
	createdItem, err := s.menuRepo.CreateMenuItem(item)
	if err != nil {
		return nil, err
	}
	// Notificar a todos los clientes sobre el nuevo ítem
	s.wsHub.BroadcastMessage("MENU_ITEM_ADDED", createdItem)
	return createdItem, nil
}

func (s *menuService) GetMenuItems() ([]domain.MenuItem, error) {
	return s.menuRepo.GetMenuItems()
}

func (s *menuService) UpdateMenuItem(id uuid.UUID, name, description, category string, price float64, modifiers domain.Modifiers) (*domain.MenuItem, error) {
	item := &domain.MenuItem{
		ID:          id,
		Name:        name,
		Description: description,
		Price:       price,
		Category:    category,
		Modifiers:   modifiers,
	}
	updatedItem, err := s.menuRepo.UpdateMenuItem(item)
	if err != nil {
		return nil, err
	}
	// Notificar a todos los clientes sobre la actualización
	s.wsHub.BroadcastMessage("MENU_ITEM_UPDATED", updatedItem)
	return updatedItem, nil
}

func (s *menuService) DeleteMenuItem(id uuid.UUID) error {
	err := s.menuRepo.DeleteMenuItem(id)
	if err != nil {
		return err
	}
	// Notificar a todos los clientes sobre la eliminación
	s.wsHub.BroadcastMessage("MENU_ITEM_DELETED", map[string]string{"id": id.String()})
	return nil
}