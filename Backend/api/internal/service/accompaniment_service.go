// =================================================================
// ARCHIVO 5: /internal/service/accompaniment_service.go (NUEVO)
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type AccompanimentService interface {
	Create(name string, price float64) (*domain.Accompaniment, error)
	GetAll() ([]domain.Accompaniment, error)
	Update(id uuid.UUID, name string, price float64) (*domain.Accompaniment, error)
	Delete(id uuid.UUID) error
}

type accompanimentService struct { repo repository.AccompanimentRepository }
func NewAccompanimentService(repo repository.AccompanimentRepository) AccompanimentService { return &accompanimentService{repo: repo} }

func (s *accompanimentService) Create(name string, price float64) (*domain.Accompaniment, error) { return s.repo.Create(name, price) }
func (s *accompanimentService) GetAll() ([]domain.Accompaniment, error) { return s.repo.GetAll() }
func (s *accompanimentService) Update(id uuid.UUID, name string, price float64) (*domain.Accompaniment, error) { return s.repo.Update(id, name, price) }
func (s *accompanimentService) Delete(id uuid.UUID) error { return s.repo.Delete(id) }