package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type CashRegisterRepository interface {
	CreateSession(session *domain.CashRegisterSession) error
	GetOpenSession() (*domain.CashRegisterSession, error)
	GetLastClosedSession() (*domain.CashRegisterSession, error)
	GetSessionByID(id uuid.UUID) (*domain.CashRegisterSession, error)
	CloseSession(session *domain.CashRegisterSession) error
	AddExpense(expense *domain.CashRegisterExpense) error
	GetExpensesBySession(sessionID uuid.UUID) ([]domain.CashRegisterExpense, error)
	GetSalesByTimeRange(openTime time.Time, closeTime time.Time) (cashSales float64, transferSales float64, cashCount int, transferCount int, err error)
	GetClosingOrderCounts(openTime time.Time, closeTime time.Time) (cashOrders int, transferOrders int, mixedOrders int, err error)
}

type postgresCashRegisterRepository struct {
	db *sql.DB
}

func NewCashRegisterRepository(db *sql.DB) CashRegisterRepository {
	return &postgresCashRegisterRepository{db: db}
}

func (r *postgresCashRegisterRepository) CreateSession(session *domain.CashRegisterSession) error {
	query := `
		INSERT INTO cash_register_sessions (id, status, open_time, initial_cash, initial_transfer, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(query, session.ID, session.Status, session.OpenTime, session.InitialCash, session.InitialTransfer, session.CreatedAt, session.UpdatedAt)
	return err
}

func (r *postgresCashRegisterRepository) GetOpenSession() (*domain.CashRegisterSession, error) {
	query := `
		SELECT id, status, open_time, close_time, initial_cash, initial_transfer, final_cash_expected, final_cash_actual, discrepancy, final_transfer_expected, final_transfer_actual, transfer_discrepancy, created_at, updated_at
		FROM cash_register_sessions
		WHERE status = 'open'
		ORDER BY created_at DESC LIMIT 1
	`
	row := r.db.QueryRow(query)
	var s domain.CashRegisterSession
	err := row.Scan(&s.ID, &s.Status, &s.OpenTime, &s.CloseTime, &s.InitialCash, &s.InitialTransfer, &s.FinalCashExpected, &s.FinalCashActual, &s.Discrepancy, &s.FinalTransferExpected, &s.FinalTransferActual, &s.TransferDiscrepancy, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // No open session
		}
		return nil, err
	}
	return &s, nil
}

func (r *postgresCashRegisterRepository) GetLastClosedSession() (*domain.CashRegisterSession, error) {
	query := `
		SELECT id, status, open_time, close_time, initial_cash, initial_transfer, final_cash_expected, final_cash_actual, discrepancy, final_transfer_expected, final_transfer_actual, transfer_discrepancy, created_at, updated_at
		FROM cash_register_sessions
		WHERE status = 'closed'
		ORDER BY close_time DESC LIMIT 1
	`
	row := r.db.QueryRow(query)
	var s domain.CashRegisterSession
	err := row.Scan(&s.ID, &s.Status, &s.OpenTime, &s.CloseTime, &s.InitialCash, &s.InitialTransfer, &s.FinalCashExpected, &s.FinalCashActual, &s.Discrepancy, &s.FinalTransferExpected, &s.FinalTransferActual, &s.TransferDiscrepancy, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // No closed session
		}
		return nil, err
	}
	return &s, nil
}

func (r *postgresCashRegisterRepository) GetSessionByID(id uuid.UUID) (*domain.CashRegisterSession, error) {
	query := `
		SELECT id, status, open_time, close_time, initial_cash, initial_transfer, final_cash_expected, final_cash_actual, discrepancy, final_transfer_expected, final_transfer_actual, transfer_discrepancy, created_at, updated_at
		FROM cash_register_sessions
		WHERE id = $1
	`
	row := r.db.QueryRow(query, id)
	var s domain.CashRegisterSession
	err := row.Scan(&s.ID, &s.Status, &s.OpenTime, &s.CloseTime, &s.InitialCash, &s.InitialTransfer, &s.FinalCashExpected, &s.FinalCashActual, &s.Discrepancy, &s.FinalTransferExpected, &s.FinalTransferActual, &s.TransferDiscrepancy, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresCashRegisterRepository) CloseSession(session *domain.CashRegisterSession) error {
	query := `
		UPDATE cash_register_sessions
		SET status = $1, close_time = $2, final_cash_expected = $3, final_cash_actual = $4, discrepancy = $5, final_transfer_expected = $6, final_transfer_actual = $7, transfer_discrepancy = $8, updated_at = $9
		WHERE id = $10
	`
	_, err := r.db.Exec(query, session.Status, session.CloseTime, session.FinalCashExpected, session.FinalCashActual, session.Discrepancy, session.FinalTransferExpected, session.FinalTransferActual, session.TransferDiscrepancy, session.UpdatedAt, session.ID)
	return err
}

func (r *postgresCashRegisterRepository) AddExpense(expense *domain.CashRegisterExpense) error {
	query := `
		INSERT INTO cash_register_expenses (id, session_id, amount, description, image_path, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(query, expense.ID, expense.SessionID, expense.Amount, expense.Description, expense.ImagePath, expense.CreatedAt)
	return err
}

func (r *postgresCashRegisterRepository) GetExpensesBySession(sessionID uuid.UUID) ([]domain.CashRegisterExpense, error) {
	query := `
		SELECT id, session_id, amount, description, image_path, created_at
		FROM cash_register_expenses
		WHERE session_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var expenses []domain.CashRegisterExpense
	for rows.Next() {
		var e domain.CashRegisterExpense
		if err := rows.Scan(&e.ID, &e.SessionID, &e.Amount, &e.Description, &e.ImagePath, &e.CreatedAt); err != nil {
			return nil, err
		}
		expenses = append(expenses, e)
	}
	return expenses, nil
}

func (r *postgresCashRegisterRepository) GetSalesByTimeRange(openTime time.Time, closeTime time.Time) (float64, float64, int, int, error) {
	var splitCash, splitTransfer float64
	var splitCashCount, splitTransferCount int
	var singleCash, singleTransfer float64
	var singleCashCount, singleTransferCount int

	// 1. Split payments
	splitQuery := `
		SELECT 
			COALESCE(SUM(CASE WHEN op.payment_method = 'efectivo' THEN op.amount ELSE 0 END), 0) AS total_cash,
			COALESCE(SUM(CASE WHEN op.payment_method = 'transferencia' THEN op.amount ELSE 0 END), 0) AS total_transfer,
			COUNT(CASE WHEN op.payment_method = 'efectivo' THEN 1 END) AS cash_count,
			COUNT(CASE WHEN op.payment_method = 'transferencia' THEN 1 END) AS transfer_count
		FROM order_payments op
		JOIN orders o ON o.id = op.order_id
		WHERE o.status = 'pagado' 
		AND o.updated_at >= $1 AND o.updated_at <= $2
	`
	err := r.db.QueryRow(splitQuery, openTime, closeTime).Scan(&splitCash, &splitTransfer, &splitCashCount, &splitTransferCount)
	if err != nil {
		return 0, 0, 0, 0, err
	}

	// 2. Single payments
	singleQuery := `
		SELECT 
			COALESCE(SUM(CASE WHEN o.payment_method = 'efectivo' THEN o.total ELSE 0 END), 0) AS total_cash,
			COALESCE(SUM(CASE WHEN o.payment_method = 'transferencia' THEN o.total ELSE 0 END), 0) AS total_transfer,
			COUNT(CASE WHEN o.payment_method = 'efectivo' THEN 1 END) AS cash_count,
			COUNT(CASE WHEN o.payment_method = 'transferencia' THEN 1 END) AS transfer_count
		FROM orders o
		WHERE o.status = 'pagado' 
		AND o.payment_method IN ('efectivo', 'transferencia')
		AND NOT EXISTS (SELECT 1 FROM order_payments op WHERE op.order_id = o.id)
		AND o.updated_at >= $1 AND o.updated_at <= $2
	`
	err = r.db.QueryRow(singleQuery, openTime, closeTime).Scan(&singleCash, &singleTransfer, &singleCashCount, &singleTransferCount)
	if err != nil {
		return 0, 0, 0, 0, err
	}

	return splitCash + singleCash, splitTransfer + singleTransfer, splitCashCount + singleCashCount, splitTransferCount + singleTransferCount, nil
}

func (r *postgresCashRegisterRepository) GetClosingOrderCounts(openTime time.Time, closeTime time.Time) (int, int, int, error) {
	var cashOrders, transferOrders, mixedOrders int

	// 1. Cash orders count: distinct pagado orders where payment_method = 'efectivo' OR has a cash payment in order_payments
	cashQuery := `
		SELECT COUNT(DISTINCT o.id)
		FROM orders o
		LEFT JOIN order_payments op ON op.order_id = o.id
		WHERE o.status = 'pagado'
		AND o.updated_at >= $1 AND o.updated_at <= $2
		AND (
			(o.payment_method = 'efectivo' AND NOT EXISTS (SELECT 1 FROM order_payments op2 WHERE op2.order_id = o.id))
			OR op.payment_method = 'efectivo'
		)
	`
	err := r.db.QueryRow(cashQuery, openTime, closeTime).Scan(&cashOrders)
	if err != nil {
		return 0, 0, 0, err
	}

	// 2. Transfer orders count: distinct pagado orders where payment_method = 'transferencia' OR has a transfer payment in order_payments
	transferQuery := `
		SELECT COUNT(DISTINCT o.id)
		FROM orders o
		LEFT JOIN order_payments op ON op.order_id = o.id
		WHERE o.status = 'pagado'
		AND o.updated_at >= $1 AND o.updated_at <= $2
		AND (
			(o.payment_method = 'transferencia' AND NOT EXISTS (SELECT 1 FROM order_payments op2 WHERE op2.order_id = o.id))
			OR op.payment_method = 'transferencia'
		)
	`
	err = r.db.QueryRow(transferQuery, openTime, closeTime).Scan(&transferOrders)
	if err != nil {
		return 0, 0, 0, err
	}

	// 3. Mixed orders count: distinct pagado orders where payment_method = 'mixto' or has both cash and transfer payments in order_payments
	mixedQuery := `
		SELECT COUNT(DISTINCT o.id)
		FROM orders o
		WHERE o.status = 'pagado'
		AND o.updated_at >= $1 AND o.updated_at <= $2
		AND (
			o.payment_method = 'mixto'
			OR (
				EXISTS (SELECT 1 FROM order_payments op1 WHERE op1.order_id = o.id AND op1.payment_method = 'efectivo')
				AND EXISTS (SELECT 1 FROM order_payments op2 WHERE op2.order_id = o.id AND op2.payment_method = 'transferencia')
			)
		)
	`
	err = r.db.QueryRow(mixedQuery, openTime, closeTime).Scan(&mixedOrders)
	if err != nil {
		return 0, 0, 0, err
	}

	return cashOrders, transferOrders, mixedOrders, nil
}
