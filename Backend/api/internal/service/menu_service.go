// =================================================================
// ARCHIVO 2: /internal/service/menu_service.go (CORREGIDO Y COMPLETO)
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

type MenuService interface {
	CreateMenuItem(payload CreateMenuItemPayload) (*domain.MenuItem, error)
	GetMenuItems() ([]domain.MenuItem, error)
	UpdateMenuItem(id uuid.UUID, payload UpdateMenuItemPayload) (*domain.MenuItem, error)
	DeleteMenuItem(id uuid.UUID) error
	IncrementOrderCount(itemID uuid.UUID) error
}

// Structs para los payloads que vienen del handler
type CreateMenuItemPayload struct {
	Name             string      `json:"name"`
	Description      string      `json:"description"`
	Price            float64     `json:"price"`
	CategoryID       uuid.UUID   `json:"category_id"`
	IngredientIDs    []uuid.UUID `json:"ingredient_ids"`
	AccompanimentIDs []uuid.UUID `json:"accompaniment_ids"`
}
type UpdateMenuItemPayload CreateMenuItemPayload

type menuService struct {
	menuRepo repository.MenuRepository
	wsHub    *wshub.Hub
}

func NewMenuService(repo repository.MenuRepository, wsHub *wshub.Hub) MenuService {
	return &menuService{menuRepo: repo, wsHub: wsHub}
}

func (s *menuService) CreateMenuItem(payload CreateMenuItemPayload) (*domain.MenuItem, error) {
	item := &domain.MenuItem{
		Name:        payload.Name,
		Description: payload.Description,
		Price:       payload.Price,
		CategoryID:  payload.CategoryID,
		IsAvailable: true,
	}
	createdItem, err := s.menuRepo.CreateMenuItem(item, payload.IngredientIDs, payload.AccompanimentIDs)
	if err != nil {
		return nil, err
	}
	s.wsHub.BroadcastMessage("MENU_ITEM_ADDED", createdItem)
	return createdItem, nil
}

func (s *menuService) GetMenuItems() ([]domain.MenuItem, error) {
	return s.menuRepo.GetMenuItems()
}

func (s *menuService) UpdateMenuItem(id uuid.UUID, payload UpdateMenuItemPayload) (*domain.MenuItem, error) {
	item := &domain.MenuItem{
		ID:          id,
		Name:        payload.Name,
		Description: payload.Description,
		Price:       payload.Price,
		CategoryID:  payload.CategoryID,
	}
	updatedItem, err := s.menuRepo.UpdateMenuItem(item, payload.IngredientIDs, payload.AccompanimentIDs)
	if err != nil {
		return nil, err
	}
	s.wsHub.BroadcastMessage("MENU_ITEM_UPDATED", updatedItem)
	return updatedItem, nil
}

func (s *menuService) DeleteMenuItem(id uuid.UUID) error {
	err := s.menuRepo.DeleteMenuItem(id)
	if err != nil {
		return err
	}
	s.wsHub.BroadcastMessage("MENU_ITEM_DELETED", map[string]string{"id": id.String()})
	return nil
}

func (s *menuService) IncrementOrderCount(itemID uuid.UUID) error {
	return s.menuRepo.IncrementOrderCount(itemID)
}
