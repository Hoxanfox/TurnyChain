package service

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type InventoryReceiptService interface {
	CreateReceipt(receivedBy uuid.UUID, payload CreateInventoryReceiptPayload) (*domain.InventoryReceipt, error)
	GetStock() ([]domain.InventoryStock, error)
	GetReceipts(userID uuid.UUID, includeAll bool) ([]domain.InventoryReceipt, error)
	UpdateReceipt(receiptID uuid.UUID, payload CreateInventoryReceiptPayload) (*domain.InventoryReceipt, error)
	DeleteReceipt(receiptID uuid.UUID) error
	SaveDraft(userID uuid.UUID, payload CreateInventoryReceiptPayload) error
	GetDraft(userID uuid.UUID) (*CreateInventoryReceiptPayload, error)
	DeleteDraft(userID uuid.UUID) error
}

func (s *inventoryReceiptService) GetStock() ([]domain.InventoryStock, error) {
	return s.repo.GetStock()
}

func (s *inventoryReceiptService) GetReceipts(userID uuid.UUID, includeAll bool) ([]domain.InventoryReceipt, error) {
	return s.repo.GetReceipts(userID, includeAll)
}

func (s *inventoryReceiptService) SaveDraft(userID uuid.UUID, payload CreateInventoryReceiptPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return s.repo.SaveDraft(userID, data)
}

func (s *inventoryReceiptService) GetDraft(userID uuid.UUID) (*CreateInventoryReceiptPayload, error) {
	data, err := s.repo.GetDraft(userID)
	if err != nil {
		return nil, err
	}
	var payload CreateInventoryReceiptPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, err
	}
	return &payload, nil
}

func (s *inventoryReceiptService) DeleteDraft(userID uuid.UUID) error {
	return s.repo.DeleteDraft(userID)
}

type CreateInventoryReceiptPayload struct {
	SupplierName string                       `json:"supplier_name"`
	Notes        string                       `json:"notes"`
	Lines        []CreateInventoryReceiptLine `json:"lines"`
}

type CreateInventoryReceiptLine struct {
	ItemName string    `json:"item_name"`
	Quantity float64   `json:"quantity"`
	Portions []float64 `json:"portions,omitempty"`
	Unit     string    `json:"unit"`
	UnitCost float64   `json:"unit_cost"`
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
		quantity := input.Quantity
		portions := input.Portions
		if len(portions) > 0 {
			quantity = 0
			for _, portion := range portions {
				if portion <= 0 {
					return nil, errors.New("partial weights must be greater than zero")
				}
				quantity += portion
			}
		}
		if itemName == "" || quantity <= 0 || input.UnitCost < 0 || !validInventoryUnit(input.Unit) {
			return nil, errors.New("each line requires an item, positive quantity, valid unit and non-negative unit cost")
		}
		lineTotal := quantity * input.UnitCost
		receipt.Lines = append(receipt.Lines, domain.InventoryReceiptLine{
			ID:        uuid.New(),
			ItemName:  itemName,
			Quantity:  quantity,
			Portions:  portions,
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

func (s *inventoryReceiptService) UpdateReceipt(receiptID uuid.UUID, payload CreateInventoryReceiptPayload) (*domain.InventoryReceipt, error) {
	receipt := &domain.InventoryReceipt{
		ID:           receiptID,
		SupplierName: strings.TrimSpace(payload.SupplierName),
		Notes:        strings.TrimSpace(payload.Notes),
		Status:       "registered",
		Lines:        make([]domain.InventoryReceiptLine, 0, len(payload.Lines)),
	}
	if err := validateAndAppendLines(receipt, payload.Lines); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateReceipt(receipt); err != nil {
		return nil, err
	}
	return receipt, nil
}

func (s *inventoryReceiptService) DeleteReceipt(receiptID uuid.UUID) error {
	return s.repo.DeleteReceipt(receiptID)
}

func validateAndAppendLines(receipt *domain.InventoryReceipt, lines []CreateInventoryReceiptLine) error {
	if len(lines) == 0 {
		return errors.New("at least one receipt line is required")
	}
	for _, input := range lines {
		itemName := strings.TrimSpace(input.ItemName)
		quantity := input.Quantity
		portions := input.Portions
		if len(portions) > 0 {
			quantity = 0
			for _, portion := range portions {
				if portion <= 0 {
					return errors.New("partial weights must be greater than zero")
				}
				quantity += portion
			}
		}
		if itemName == "" || quantity <= 0 || input.UnitCost < 0 || !validInventoryUnit(input.Unit) {
			return errors.New("each line requires an item, positive quantity, valid unit and non-negative unit cost")
		}
		lineTotal := quantity * input.UnitCost
		receipt.Lines = append(receipt.Lines, domain.InventoryReceiptLine{ID: uuid.New(), ItemName: itemName, Quantity: quantity, Portions: portions, Unit: input.Unit, UnitCost: input.UnitCost, LineTotal: lineTotal})
		receipt.Total += lineTotal
	}
	return nil
}

func validInventoryUnit(unit string) bool {
	switch unit {
	case domain.InventoryUnitKilogram, domain.InventoryUnitGram, domain.InventoryUnitPound, domain.InventoryUnitItem, domain.InventoryUnitBox:
		return true
	default:
		return false
	}
}
