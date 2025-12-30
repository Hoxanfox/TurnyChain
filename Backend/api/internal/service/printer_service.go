// =================================================================
// Printer Service
// =================================================================
package service

import (
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type PrinterService struct {
	repo *repository.PrinterRepository
}

func NewPrinterService(repo *repository.PrinterRepository) *PrinterService {
	return &PrinterService{repo: repo}
}

func (s *PrinterService) GetAll() ([]domain.Printer, error) {
	return s.repo.GetAll()
}

func (s *PrinterService) GetAllActive() ([]domain.Printer, error) {
	return s.repo.GetAllActive()
}

func (s *PrinterService) GetByID(id uuid.UUID) (*domain.Printer, error) {
	printer, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if printer == nil {
		return nil, fmt.Errorf("printer not found")
	}
	return printer, nil
}

func (s *PrinterService) GetByStationID(stationID uuid.UUID) ([]domain.Printer, error) {
	return s.repo.GetByStationID(stationID)
}

func (s *PrinterService) Create(req domain.CreatePrinterRequest) (*domain.Printer, error) {
	return s.repo.Create(req)
}

func (s *PrinterService) Update(id uuid.UUID, req domain.UpdatePrinterRequest) error {
	// Verificar que la impresora existe
	_, err := s.GetByID(id)
	if err != nil {
		return err
	}
	return s.repo.Update(id, req)
}

func (s *PrinterService) Delete(id uuid.UUID) error {
	// Verificar que la impresora existe
	_, err := s.GetByID(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(id)
}
