package service

import (
	"errors"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type InventoryReceiptService interface {
	CreateReceipt(receivedBy uuid.UUID, payload CreateInventoryReceiptPayload) (*domain.InventoryReceipt, error)
	GetReceipts() ([]domain.InventoryReceipt, error)
	GetStock() ([]domain.InventoryStock, error)
}

func (s *inventoryReceiptService) GetReceipts() ([]domain.InventoryReceipt, error) {
	return s.repo.GetReceipts()
}

func (s *inventoryReceiptService) GetStock() ([]domain.InventoryStock, error) {
	return s.repo.GetStock()
}

type CreateInventoryReceiptPayload struct {
	SupplierName string                       `json:"supplier_name"`
	Notes        string                       `json:"notes"`
	Lines        []CreateInventoryReceiptLine `json:"lines"`
}

type CreateInventoryReceiptLine struct {
	ItemName string  `json:"item_name"`
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit"`
	UnitCost float64 `json:"unit_cost"`
}

type inventoryReceiptService struct {
	repo repository.InventoryReceiptRepository
}

func NewInventoryReceiptService(repo repository.InventoryReceiptRepository) InventoryReceiptService {
	return &inventoryReceiptService{repo: repo}
}

func (s *inventoryReceiptService) CreateReceipt(receivedBy uuid.UUID, payload CreateInventoryReceiptPayload) (*domain.InventoryReceipt, error) {
	if len(payload.Lines) == 0 {
		return nil, errors.New("at least one receipt line is required")
	}

	receipt := &domain.InventoryReceipt{
		ID:            uuid.New(),
		ReceiptNumber: "REC-" + time.Now().UTC().Format("20060102-150405") + "-" + uuid.New().String()[:8],
		ReceivedBy:    receivedBy,
		SupplierName:  strings.TrimSpace(payload.SupplierName),
		Notes:         strings.TrimSpace(payload.Notes),
		Status:        "registered",
		CreatedAt:     time.Now().UTC(),
		Lines:         make([]domain.InventoryReceiptLine, 0, len(payload.Lines)),
	}

	for _, input := range payload.Lines {
		itemName := strings.TrimSpace(input.ItemName)
		if itemName == "" || input.Quantity <= 0 || input.UnitCost < 0 || !validInventoryUnit(input.Unit) {
			return nil, errors.New("each line requires an item, positive quantity, valid unit and non-negative unit cost")
		}
		lineTotal := input.Quantity * input.UnitCost
		receipt.Lines = append(receipt.Lines, domain.InventoryReceiptLine{
			ID:        uuid.New(),
			ItemName:  itemName,
			Quantity:  input.Quantity,
			Unit:      input.Unit,
			UnitCost:  input.UnitCost,
			LineTotal: lineTotal,
		})
		receipt.Total += lineTotal
	}

	if err := s.repo.CreateReceipt(receipt); err != nil {
		return nil, err
	}
	return receipt, nil
}

func validInventoryUnit(unit string) bool {
	switch unit {
	case domain.InventoryUnitKilogram, domain.InventoryUnitGram, domain.InventoryUnitPound, domain.InventoryUnitItem, domain.InventoryUnitBox:
		return true
	default:
		return false
	}
}
