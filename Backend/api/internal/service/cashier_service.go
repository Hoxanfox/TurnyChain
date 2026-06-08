package service

import (
	"errors"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type CashierService interface {
	OpenSession(cashierID uuid.UUID, initialFund float64) (*domain.CashierSession, error)
	GetActiveSession(cashierID uuid.UUID) (*domain.CashierSession, error)
	AddExpense(cashierID uuid.UUID, amount float64, description string, imagePath *string) (*domain.CashierExpense, error)
	CloseSession(cashierID uuid.UUID, actualCash float64, notes string) (*domain.CashierSession, error)
}

type cashierService struct {
	cashierRepo repository.CashierRepository
}

func NewCashierService(cashierRepo repository.CashierRepository) CashierService {
	return &cashierService{cashierRepo: cashierRepo}
}

func (s *cashierService) OpenSession(cashierID uuid.UUID, initialFund float64) (*domain.CashierSession, error) {
	active, err := s.cashierRepo.GetActiveSession(cashierID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, errors.New("ya existe una sesión de caja activa para este usuario")
	}
	return s.cashierRepo.CreateSession(cashierID, initialFund)
}

func (s *cashierService) GetActiveSession(cashierID uuid.UUID) (*domain.CashierSession, error) {
	session, err := s.cashierRepo.GetActiveSession(cashierID)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, nil // Sin sesión activa
	}

	// 1. Recalcular ventas en tiempo real
	cashSales, transferSales, ordersCount, err := s.cashierRepo.GetSessionSalesTotals(cashierID, session.OpenedAt)
	if err != nil {
		return nil, err
	}
	session.CashSales = cashSales
	session.TransferSales = transferSales
	session.TotalSales = cashSales + transferSales
	session.OrdersCount = ordersCount

	// 2. Cargar egresos/gastos
	expenses, err := s.cashierRepo.GetSessionExpenses(session.ID)
	if err != nil {
		return nil, err
	}
	session.Expenses = expenses

	return session, nil
}

func (s *cashierService) AddExpense(cashierID uuid.UUID, amount float64, description string, imagePath *string) (*domain.CashierExpense, error) {
	active, err := s.cashierRepo.GetActiveSession(cashierID)
	if err != nil {
		return nil, err
	}
	if active == nil {
		return nil, errors.New("no hay ninguna sesión de caja activa para este usuario")
	}
	return s.cashierRepo.AddExpense(active.ID, amount, description, imagePath)
}

func (s *cashierService) CloseSession(cashierID uuid.UUID, actualCash float64, notes string) (*domain.CashierSession, error) {
	active, err := s.cashierRepo.GetActiveSession(cashierID)
	if err != nil {
		return nil, err
	}
	if active == nil {
		return nil, errors.New("no hay ninguna sesión de caja activa para este usuario")
	}

	// 1. Calcular totales de ventas del turno
	cashSales, transferSales, ordersCount, err := s.cashierRepo.GetSessionSalesTotals(cashierID, active.OpenedAt)
	if err != nil {
		return nil, err
	}

	// 2. Calcular egresos totales
	expenses, err := s.cashierRepo.GetSessionExpenses(active.ID)
	if err != nil {
		return nil, err
	}
	var totalExpenses float64
	for _, exp := range expenses {
		totalExpenses += exp.Amount
	}

	// 3. Arqueo contable: Fondo Inicial + Ventas Efectivo - Egresos
	expectedCash := active.InitialFund + cashSales - totalExpenses
	discrepancy := actualCash - expectedCash

	// 4. Cerrar sesión en BD
	session, err := s.cashierRepo.CloseSession(active.ID, expectedCash, actualCash, discrepancy, notes)
	if err != nil {
		return nil, err
	}

	// Completar datos de retorno para el reporte final del cliente
	session.CashSales = cashSales
	session.TransferSales = transferSales
	session.TotalSales = cashSales + transferSales
	session.OrdersCount = ordersCount
	session.Expenses = expenses

	return session, nil
}
