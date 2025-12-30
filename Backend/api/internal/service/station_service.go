// =================================================================
// Station Service
// =================================================================
package service

import (
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type StationService struct {
	repo *repository.StationRepository
}

func NewStationService(repo *repository.StationRepository) *StationService {
	return &StationService{repo: repo}
}

func (s *StationService) GetAll() ([]domain.Station, error) {
	return s.repo.GetAll()
}

func (s *StationService) GetAllActive() ([]domain.Station, error) {
	return s.repo.GetAllActive()
}

func (s *StationService) GetByID(id uuid.UUID) (*domain.Station, error) {
	station, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if station == nil {
		return nil, fmt.Errorf("station not found")
	}
	return station, nil
}

func (s *StationService) Create(req domain.CreateStationRequest) (*domain.Station, error) {
	return s.repo.Create(req)
}

func (s *StationService) Update(id uuid.UUID, req domain.UpdateStationRequest) error {
	// Verificar que la estación existe
	_, err := s.GetByID(id)
	if err != nil {
		return err
	}
	return s.repo.Update(id, req)
}

func (s *StationService) Delete(id uuid.UUID) error {
	// Verificar que la estación exists
	_, err := s.GetByID(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(id)
}
