// =================================================================
// ARCHIVO 2: /internal/service/ingredient_service.go (NUEVO)
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type IngredientService interface {
	Create(name string) (*domain.Ingredient, error)
	GetAll() ([]domain.Ingredient, error)
	Update(id uuid.UUID, name string) (*domain.Ingredient, error)
	Delete(id uuid.UUID) error
}

type ingredientService struct { repo repository.IngredientRepository }
func NewIngredientService(repo repository.IngredientRepository) IngredientService { return &ingredientService{repo: repo} }

func (s *ingredientService) Create(name string) (*domain.Ingredient, error) { return s.repo.Create(name) }
func (s *ingredientService) GetAll() ([]domain.Ingredient, error) { return s.repo.GetAll() }
func (s *ingredientService) Update(id uuid.UUID, name string) (*domain.Ingredient, error) { return s.repo.Update(id, name) }
func (s *ingredientService) Delete(id uuid.UUID) error { return s.repo.Delete(id) }