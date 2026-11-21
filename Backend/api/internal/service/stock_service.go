package service

import (
	"fmt"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

type StockService interface {
	GetItems(waiterID ...uuid.UUID) ([]domain.StockItem, error)
	SyncCartReservations(waiterID uuid.UUID, items []domain.OrderItem) error
	ReleaseCartReservations(waiterID uuid.UUID) error
	ResetDayReservations() (int64, error)
	SetQuantity(id uuid.UUID, quantity float64) error
	DeleteQuantity(id uuid.UUID) error
	UpdateLocations(id uuid.UUID, warehouse, display float64) error
	Receive(receivedBy uuid.UUID, receipt domain.StockReceipt) error
}

type stockService struct { repo repository.StockRepository; hub *wshub.Hub }

func NewStockService(repo repository.StockRepository, hub *wshub.Hub) StockService {
	return &stockService{repo: repo, hub: hub}
}
func (s *stockService) GetItems(waiterID ...uuid.UUID) ([]domain.StockItem, error) { return s.repo.GetItems(waiterID...) }
func (s *stockService) SyncCartReservations(waiterID uuid.UUID, items []domain.OrderItem) error {
	changed, err := s.repo.SyncCartReservations(waiterID, items)
	if err != nil { return err }
	if changed && s.hub != nil {
		s.broadcastReservations(items)
	}
	return nil
}
func (s *stockService) ReleaseCartReservations(waiterID uuid.UUID) error {
	changed, err := s.repo.ReleaseCartReservations(waiterID)
	if err != nil { return err }
	if changed && s.hub != nil {
		s.broadcastReservations(nil)
	}
	return nil
}

// ResetDayReservations libera las reservas del día anterior (reinicio
// automático de jornada) y avisa a todos los clientes para que vacíen sus
// carritos y refresquen las existencias disponibles.
func (s *stockService) ResetDayReservations() (int64, error) {
	affected, err := s.repo.ResetDayReservations()
	if err != nil {
		return 0, err
	}
	if s.hub != nil {
		payload := map[string]interface{}{
			"released_reservations": affected,
		}
		if stockItems, err := s.repo.GetItems(); err == nil {
			payload["items"] = stockItems
		}
		s.hub.BroadcastMessage("DAY_RESET", payload)
	}
	return affected, nil
}
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

func (s *stockService) broadcastReservations(items []domain.OrderItem) {
	if stockItems, err := s.repo.GetItems(); err == nil {
		affectedIDs := make([]string, 0)
		seen := make(map[string]bool)
		for _, item := range items {
			id := item.MenuItemID.String()
			if !seen[id] {
				seen[id] = true
				affectedIDs = append(affectedIDs, id)
			}
		}
		s.hub.BroadcastMessage("CART_RESERVATIONS_UPDATED", map[string]interface{}{
			"items": stockItems,
			"affected_item_ids": affectedIDs,
		})
	}
}
