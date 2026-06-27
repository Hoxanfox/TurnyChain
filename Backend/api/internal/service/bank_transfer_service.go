package service

import (
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/utils"
)

type BankTransferService interface {
	ProcessEmailWebhook(rawText string) (*domain.BankTransfer, error)
	GetRecent() ([]domain.BankTransfer, error)
	GetUnusedByAmount(amount float64) ([]domain.BankTransfer, error)
	MarkAsUsed(transferID string, orderID string) error
	SearchTransfers(startTime, endTime time.Time, offset, limit int) ([]domain.BankTransfer, int, error)
}

type bankTransferService struct {
	repo repository.BankTransferRepository
}

func NewBankTransferService(repo repository.BankTransferRepository) BankTransferService {
	return &bankTransferService{repo: repo}
}

func (s *bankTransferService) ProcessEmailWebhook(rawText string) (*domain.BankTransfer, error) {
	// Parse the email text
	transfer, err := utils.ParseNequiEmail(rawText)
	if err != nil {
		return nil, err
	}

	// Save to DB
	if err := s.repo.Create(transfer); err != nil {
		return nil, err
	}

	return transfer, nil
}

func (s *bankTransferService) GetRecent() ([]domain.BankTransfer, error) {
	// Let's get the last 50 for the UI panel
	return s.repo.GetRecent(50)
}

func (s *bankTransferService) GetUnusedByAmount(amount float64) ([]domain.BankTransfer, error) {
	return s.repo.GetUnusedByAmount(amount)
}

func (s *bankTransferService) MarkAsUsed(transferID string, orderID string) error {
	return s.repo.MarkAsUsed(transferID, orderID)
}

func (s *bankTransferService) SearchTransfers(startTime, endTime time.Time, offset, limit int) ([]domain.BankTransfer, int, error) {
	return s.repo.SearchTransfers(startTime, endTime, offset, limit)
}

