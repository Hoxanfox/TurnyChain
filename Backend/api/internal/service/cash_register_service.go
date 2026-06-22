package service

import (
	"errors"
	"log"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/google/uuid"
)

type CashRegisterService interface {
	OpenSession(initialCash float64, initialTransfer float64) (*domain.CashRegisterSession, error)
	GetCurrentSessionDetails() (*domain.CashRegisterSessionDetails, error)
	GetClosingSessionDetails() (*domain.CashRegisterClosingDetails, error)
	AddExpense(amount float64, description string, imagePath *string) (*domain.CashRegisterExpense, error)
	CloseSession(finalCashActual float64, finalTransferActual float64) (*domain.CashRegisterSession, error)
}

type cashRegisterService struct {
	repo repository.CashRegisterRepository
}

func NewCashRegisterService(repo repository.CashRegisterRepository) CashRegisterService {
	return &cashRegisterService{repo: repo}
}

func (s *cashRegisterService) OpenSession(initialCash float64, initialTransfer float64) (*domain.CashRegisterSession, error) {
	existingSession, err := s.repo.GetOpenSession()
	if err != nil {
		return nil, err
	}
	if existingSession != nil {
		return nil, errors.New("there is already an open session")
	}

	now := time.Now()
	session := &domain.CashRegisterSession{
		ID:              uuid.New(),
		Status:          "open",
		OpenTime:        now,
		InitialCash:     initialCash,
		InitialTransfer: initialTransfer,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	err = s.repo.CreateSession(session)
	if err != nil {
		return nil, err
	}
	return session, nil
}

func (s *cashRegisterService) GetCurrentSessionDetails() (*domain.CashRegisterSessionDetails, error) {
	session, err := s.repo.GetOpenSession()
	if err != nil {
		return nil, err
	}
	if session == nil {
		return &domain.CashRegisterSessionDetails{
			Session: nil,
		}, nil
	}

	expenses, err := s.repo.GetExpensesBySession(session.ID)
	if err != nil {
		return nil, err
	}

	var totalExpenses float64
	for _, e := range expenses {
		totalExpenses += e.Amount
	}

	loc := time.Local
	if bogota, err := time.LoadLocation("America/Bogota"); err == nil {
		loc = bogota
	}
	now := time.Now().In(loc)
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	// Determinar el tiempo de inicio basado en el cierre de la última sesión
	lastClosedSession, err := s.repo.GetLastClosedSession()
	var startTime time.Time
	if err != nil || lastClosedSession == nil || lastClosedSession.CloseTime == nil {
		startTime = startOfToday
		log.Printf("📊 [GetCurrentSessionDetails] Calculating daily sales from start of day: %s (No previous session)", startTime.Format(time.RFC3339))
	} else if lastClosedSession.CloseTime.Before(startOfToday) {
		startTime = startOfToday
		log.Printf("📊 [GetCurrentSessionDetails] Calculating daily sales from start of day: %s (Previous session was from a previous day)", startTime.Format(time.RFC3339))
	} else {
		startTime = *lastClosedSession.CloseTime
		log.Printf("📊 [GetCurrentSessionDetails] Calculating daily sales from last closed session: %s (Session OpenTime: %s) to Now", startTime.Format(time.RFC3339), session.OpenTime.Format(time.RFC3339))
	}

	// Sumar las ventas del rango de tiempo
	totalCashSales, totalTransferSales, cashCount, transferCount, err := s.repo.GetSalesByTimeRange(startTime, time.Now())
	if err != nil {
		return nil, err
	}

	// Calcular los conteos exactos de órdenes únicas
	cashOrders, transferOrders, mixedOrders, err := s.repo.GetClosingOrderCounts(startTime, time.Now())
	if err != nil {
		return nil, err
	}

	expectedCash := session.InitialCash + totalCashSales - totalExpenses

	return &domain.CashRegisterSessionDetails{
		Session:                   session,
		Expenses:                  expenses,
		TotalCashSales:            totalCashSales,
		TotalTransfer:             totalTransferSales + session.InitialTransfer,
		TotalExpenses:             totalExpenses,
		ExpectedCash:              expectedCash,
		CashTransactionsCount:     cashCount,
		TransferTransactionsCount: transferCount,
		CashOrdersCount:           cashOrders,
		TransferOrdersCount:       transferOrders,
		MixedOrdersCount:          mixedOrders,
	}, nil
}

func (s *cashRegisterService) AddExpense(amount float64, description string, imagePath *string) (*domain.CashRegisterExpense, error) {
	session, err := s.repo.GetOpenSession()
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, errors.New("cannot add expense: no open session")
	}

	expense := &domain.CashRegisterExpense{
		ID:          uuid.New(),
		SessionID:   session.ID,
		Amount:      amount,
		Description: description,
		ImagePath:   imagePath,
		CreatedAt:   time.Now(),
	}

	err = s.repo.AddExpense(expense)
	if err != nil {
		return nil, err
	}
	return expense, nil
}

func (s *cashRegisterService) CloseSession(finalCashActual float64, finalTransferActual float64) (*domain.CashRegisterSession, error) {
	details, err := s.GetCurrentSessionDetails()
	if err != nil {
		return nil, err
	}
	if details.Session == nil {
		return nil, errors.New("there is no open session to close")
	}

	now := time.Now()
	cashDiscrepancy := finalCashActual - details.ExpectedCash
	transferDiscrepancy := finalTransferActual - details.TotalTransfer

	session := details.Session
	session.Status = "closed"
	session.CloseTime = &now
	session.FinalCashExpected = &details.ExpectedCash
	session.FinalCashActual = &finalCashActual
	session.Discrepancy = &cashDiscrepancy
	session.FinalTransferExpected = &details.TotalTransfer
	session.FinalTransferActual = &finalTransferActual
	session.TransferDiscrepancy = &transferDiscrepancy
	session.UpdatedAt = now

	err = s.repo.CloseSession(session)
	if err != nil {
		return nil, err
	}
	return session, nil
}

func (s *cashRegisterService) GetClosingSessionDetails() (*domain.CashRegisterClosingDetails, error) {
	session, err := s.repo.GetOpenSession()
	if err != nil {
		return nil, err
	}
	if session == nil {
		return &domain.CashRegisterClosingDetails{
			Session: nil,
		}, nil
	}

	expenses, err := s.repo.GetExpensesBySession(session.ID)
	if err != nil {
		return nil, err
	}

	var totalExpenses float64
	for _, e := range expenses {
		totalExpenses += e.Amount
	}

	loc := time.Local
	if bogota, err := time.LoadLocation("America/Bogota"); err == nil {
		loc = bogota
	}
	now := time.Now().In(loc)
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	// Determinar el tiempo de inicio basado en el cierre de la última sesión
	lastClosedSession, err := s.repo.GetLastClosedSession()
	var startTime time.Time
	if err != nil || lastClosedSession == nil || lastClosedSession.CloseTime == nil {
		startTime = startOfToday
		log.Printf("📊 [GetClosingSessionDetails] Calculating sales from start of day: %s (No previous session)", startTime.Format(time.RFC3339))
	} else if lastClosedSession.CloseTime.Before(startOfToday) {
		startTime = startOfToday
		log.Printf("📊 [GetClosingSessionDetails] Calculating sales from start of day: %s (Previous session was from a previous day)", startTime.Format(time.RFC3339))
	} else {
		startTime = *lastClosedSession.CloseTime
		log.Printf("📊 [GetClosingSessionDetails] Calculating sales from last closed session: %s to Now", startTime.Format(time.RFC3339))
	}

	// 1. Sumar los montos monetarios de las ventas del rango de tiempo
	totalCashSales, totalTransferSales, _, _, err := s.repo.GetSalesByTimeRange(startTime, time.Now())
	if err != nil {
		return nil, err
	}

	// 2. Calcular los conteos exactos de órdenes únicas para el cierre
	cashOrders, transferOrders, mixedOrders, err := s.repo.GetClosingOrderCounts(startTime, time.Now())
	if err != nil {
		return nil, err
	}

	expectedCash := session.InitialCash + totalCashSales - totalExpenses

	return &domain.CashRegisterClosingDetails{
		Session:             session,
		Expenses:            expenses,
		TotalCashSales:      totalCashSales,
		TotalTransfer:       totalTransferSales + session.InitialTransfer,
		TotalExpenses:       totalExpenses,
		ExpectedCash:        expectedCash,
		CashOrdersCount:     cashOrders,
		TransferOrdersCount: transferOrders,
		MixedOrdersCount:    mixedOrders,
	}, nil
}
