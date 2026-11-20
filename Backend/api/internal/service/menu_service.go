// =================================================================
// ARCHIVO 2: /internal/service/menu_service.go (CORREGIDO Y COMPLETO)
// =================================================================
package service

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

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
	UploadMenuItemImage(itemID uuid.UUID, file *multipart.FileHeader) (*domain.MenuItem, error)
}

// Structs para los payloads que vienen del handler
type CreateMenuItemPayload struct {
	Name             string      `json:"name"`
	Description      string      `json:"description"`
	Price            float64     `json:"price"`
	CategoryID       uuid.UUID   `json:"category_id"`
	IngredientIDs    []uuid.UUID `json:"ingredient_ids"`
	AccompanimentIDs []uuid.UUID `json:"accompaniment_ids"`
	TracksStock      bool        `json:"tracks_stock"`
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
		TracksStock: payload.TracksStock,
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
		TracksStock: payload.TracksStock,
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

func (s *menuService) UploadMenuItemImage(itemID uuid.UUID, file *multipart.FileHeader) (*domain.MenuItem, error) {
	if file == nil {
		return nil, fmt.Errorf("image file is required")
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		return nil, fmt.Errorf("image must be JPG, PNG or WebP")
	}
	if file.Size > 5*1024*1024 {
		return nil, fmt.Errorf("image must be smaller than 5 MB")
	}

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	uploadDir := filepath.Join("uploads", "menu-items")
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return nil, err
	}
	filename := itemID.String() + ext
	for _, oldExt := range []string{".jpg", ".jpeg", ".png", ".webp"} {
		_ = os.Remove(filepath.Join(uploadDir, itemID.String()+oldExt))
	}
	filePath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, err
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return nil, err
	}

	imageURL := "/api/static/menu-items/" + filename
	if err := s.menuRepo.SetMenuItemImage(itemID, imageURL); err != nil {
		return nil, err
	}
	item, err := s.menuRepo.GetMenuItems()
	if err != nil {
		return nil, err
	}
	for index := range item {
		if item[index].ID == itemID {
			if s.wsHub != nil {
				s.wsHub.BroadcastMessage("MENU_ITEM_UPDATED", &item[index])
			}
			return &item[index], nil
		}
	}
	return nil, fmt.Errorf("menu item not found")
}
