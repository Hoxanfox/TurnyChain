package service

import (
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
)

// InvoiceService define operaciones de historial de facturas.
type InvoiceService interface {
	GetInvoiceHistory(query string, from *time.Time, to *time.Time, limit int, offset int) ([]domain.InvoiceHistoryItem, error)
}

type invoiceService struct {
	orderRepo repository.OrderRepository
}

func NewInvoiceService(orderRepo repository.OrderRepository) InvoiceService {
	return &invoiceService{orderRepo: orderRepo}
}

func (s *invoiceService) GetInvoiceHistory(query string, from *time.Time, to *time.Time, limit int, offset int) ([]domain.InvoiceHistoryItem, error) {
	return s.orderRepo.GetInvoiceHistory(query, from, to, limit, offset)
}
