package service

import (
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type StockService interface {
	GetItems() ([]domain.StockItem, error)
	SetQuantity(id uuid.UUID, quantity float64) error
	DeleteQuantity(id uuid.UUID) error
}

type stockService struct{ repo repository.StockRepository }

func NewStockService(repo repository.StockRepository) StockService { return &stockService{repo: repo} }

func (s *stockService) GetItems() ([]domain.StockItem, error) { return s.repo.GetItems() }

func (s *stockService) SetQuantity(id uuid.UUID, quantity float64) error {
	if quantity < 0 {
		return fmt.Errorf("quantity cannot be negative")
	}
	return s.repo.SetQuantity(id, quantity)
}

func (s *stockService) DeleteQuantity(id uuid.UUID) error { return s.repo.DeleteQuantity(id) }
