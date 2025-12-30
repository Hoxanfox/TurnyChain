// =================================================================
// ARCHIVO 5: /internal/service/table_service.go (NUEVO ARCHIVO)
// =================================================================
package service

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
)

type TableService interface {
	Create(tableNumber int) (*domain.Table, error)
	GetAll(onlyActive bool) ([]domain.Table, error)
}

type tableService struct { repo repository.TableRepository }

func NewTableService(repo repository.TableRepository) TableService {
	return &tableService{repo: repo}
}

func (s *tableService) Create(tableNumber int) (*domain.Table, error) {
	return s.repo.Create(tableNumber)
}

func (s *tableService) GetAll(onlyActive bool) ([]domain.Table, error) {
	return s.repo.GetAll(onlyActive)
}