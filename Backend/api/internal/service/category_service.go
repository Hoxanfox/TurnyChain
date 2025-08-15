
// =================================================================
// ARCHIVO 6: /internal/service/category_service.go
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type CategoryService interface {
	Create(name string) (*domain.Category, error)
	GetAll() ([]domain.Category, error)
	Update(id uuid.UUID, name string) (*domain.Category, error)
	Delete(id uuid.UUID) error
}

type categoryService struct { repo repository.CategoryRepository }
func NewCategoryService(repo repository.CategoryRepository) CategoryService { return &categoryService{repo: repo} }

func (s *categoryService) Create(name string) (*domain.Category, error) { return s.repo.Create(name) }
func (s *categoryService) GetAll() ([]domain.Category, error) { return s.repo.GetAll() }
func (s *categoryService) Update(id uuid.UUID, name string) (*domain.Category, error) { return s.repo.Update(id, name) }
func (s *categoryService) Delete(id uuid.UUID) error { return s.repo.Delete(id) }