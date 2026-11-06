package service

import (
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

type StockService interface {
	GetItems() ([]domain.StockItem, error)
	SetQuantity(id uuid.UUID, quantity float64) error
	DeleteQuantity(id uuid.UUID) error
	UpdateLocations(id uuid.UUID, warehouse, display float64) error
	Receive(receivedBy uuid.UUID, receipt domain.StockReceipt) error
}

type stockService struct { repo repository.StockRepository; hub *wshub.Hub }

func NewStockService(repo repository.StockRepository, hub *wshub.Hub) StockService {
	return &stockService{repo: repo, hub: hub}
}
func (s *stockService) GetItems() ([]domain.StockItem, error) { return s.repo.GetItems() }
func (s *stockService) SetQuantity(id uuid.UUID, quantity float64) error {
	if quantity < 0 { return fmt.Errorf("quantity cannot be negative") }
	if err := s.repo.SetQuantity(id, quantity); err != nil { return err }
	s.broadcast(); return nil
}
func (s *stockService) DeleteQuantity(id uuid.UUID) error {
	if err := s.repo.DeleteQuantity(id); err != nil { return err }
	s.broadcast(); return nil
}
func (s *stockService) UpdateLocations(id uuid.UUID, warehouse, display float64) error {
	if warehouse < 0 || display < 0 { return fmt.Errorf("las existencias no pueden ser negativas") }
	if err := s.repo.UpdateLocations(id, warehouse, display); err != nil { return err }
	s.broadcast(); return nil
}
func (s *stockService) Receive(receivedBy uuid.UUID, receipt domain.StockReceipt) error {
	if len(receipt.Lines) == 0 { return fmt.Errorf("agrega al menos un producto") }
	if err := s.repo.Receive(receivedBy, receipt); err != nil { return err }
	s.broadcast(); return nil
}
func (s *stockService) broadcast() {
	if s.hub == nil { return }
	if items, err := s.repo.GetItems(); err == nil { s.hub.BroadcastMessage("STOCK_UPDATED", items) }
}
