package repository

import (
	"database/sql"
	"time"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type CashierRepository interface {
	CreateSession(cashierID uuid.UUID, initialFund float64) (*domain.CashierSession, error)
	GetActiveSession(cashierID uuid.UUID) (*domain.CashierSession, error)
	AddExpense(sessionID uuid.UUID, amount float64, description string, imagePath *string) (*domain.CashierExpense, error)
	GetSessionExpenses(sessionID uuid.UUID) ([]domain.CashierExpense, error)
	CloseSession(sessionID uuid.UUID, expectedCash, actualCash, discrepancy float64, notes string) (*domain.CashierSession, error)
	GetSessionSalesTotals(cashierID uuid.UUID, openedAt time.Time) (cashSales, transferSales float64, ordersCount int, err error)
}

type cashierRepository struct {
	db *sql.DB
}

func NewCashierRepository(db *sql.DB) CashierRepository {
	return &cashierRepository{db: db}
}

func (r *cashierRepository) CreateSession(cashierID uuid.UUID, initialFund float64) (*domain.CashierSession, error) {
	// Obtener el nombre del cajero primero
	var username string
	err := r.db.QueryRow("SELECT username FROM users WHERE id = $1", cashierID).Scan(&username)
	if err != nil {
		return nil, err
	}

	session := &domain.CashierSession{
		ID:          uuid.New(),
		CashierID:   cashierID,
		CashierName: username,
		InitialFund: initialFund,
		OpenedAt:    time.Now().UTC(),
		Status:      "open",
	}

	query := `INSERT INTO cashier_sessions (id, cashier_id, initial_fund, opened_at, status) 
	          VALUES ($1, $2, $3, $4, $5) 
	          RETURNING id, opened_at`
	
	err = r.db.QueryRow(query, session.ID, session.CashierID, session.InitialFund, session.OpenedAt, session.Status).Scan(&session.ID, &session.OpenedAt)
	if err != nil {
		return nil, err
	}
	return session, nil
}

func (r *cashierRepository) GetActiveSession(cashierID uuid.UUID) (*domain.CashierSession, error) {
	session := &domain.CashierSession{}
	query := `SELECT s.id, s.cashier_id, u.username, s.initial_fund, s.opened_at, s.status 
	          FROM cashier_sessions s
	          JOIN users u ON s.cashier_id = u.id
	          WHERE s.cashier_id = $1 AND s.status = 'open' 
	          LIMIT 1`
	
	err := r.db.QueryRow(query, cashierID).Scan(
		&session.ID,
		&session.CashierID,
		&session.CashierName,
		&session.InitialFund,
		&session.OpenedAt,
		&session.Status,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No hay sesión activa
		}
		return nil, err
	}
	return session, nil
}

func (r *cashierRepository) AddExpense(sessionID uuid.UUID, amount float64, description string, imagePath *string) (*domain.CashierExpense, error) {
	expense := &domain.CashierExpense{
		ID:          uuid.New(),
		SessionID:   sessionID,
		Amount:      amount,
		Description: description,
		ImagePath:   imagePath,
		CreatedAt:   time.Now().UTC(),
	}

	query := `INSERT INTO cashier_expenses (id, session_id, amount, description, image_path, created_at) 
	          VALUES ($1, $2, $3, $4, $5, $6) 
	          RETURNING id, created_at`
	
	err := r.db.QueryRow(query, expense.ID, expense.SessionID, expense.Amount, expense.Description, expense.ImagePath, expense.CreatedAt).Scan(&expense.ID, &expense.CreatedAt)
	if err != nil {
		return nil, err
	}
	return expense, nil
}

func (r *cashierRepository) GetSessionExpenses(sessionID uuid.UUID) ([]domain.CashierExpense, error) {
	query := `SELECT id, session_id, amount, description, image_path, created_at 
	          FROM cashier_expenses 
	          WHERE session_id = $1 
	          ORDER BY created_at ASC`
	
	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	expenses := make([]domain.CashierExpense, 0)
	for rows.Next() {
		var exp domain.CashierExpense
		err := rows.Scan(
			&exp.ID,
			&exp.SessionID,
			&exp.Amount,
			&exp.Description,
			&exp.ImagePath,
			&exp.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		expenses = append(expenses, exp)
	}
	return expenses, nil
}

func (r *cashierRepository) CloseSession(sessionID uuid.UUID, expectedCash, actualCash, discrepancy float64, notes string) (*domain.CashierSession, error) {
	closedAt := time.Now().UTC()
	session := &domain.CashierSession{
		ID:           sessionID,
		ClosedAt:     &closedAt,
		ExpectedCash: &expectedCash,
		ActualCash:   &actualCash,
		Discrepancy:  &discrepancy,
		Notes:        &notes,
		Status:       "closed",
	}

	query := `UPDATE cashier_sessions 
	          SET closed_at = $2, expected_cash = $3, actual_cash = $4, discrepancy = $5, notes = $6, status = 'closed' 
	          WHERE id = $1 
	          RETURNING cashier_id, initial_fund, opened_at`
	
	err := r.db.QueryRow(query, session.ID, session.ClosedAt, session.ExpectedCash, session.ActualCash, session.Discrepancy, session.Notes).Scan(
		&session.CashierID,
		&session.InitialFund,
		&session.OpenedAt,
	)
	if err != nil {
		return nil, err
	}

	// Obtener el nombre del cajero
	var username string
	err = r.db.QueryRow("SELECT username FROM users WHERE id = $1", session.CashierID).Scan(&username)
	if err == nil {
		session.CashierName = username
	}

	return session, nil
}

func (r *cashierRepository) GetSessionSalesTotals(cashierID uuid.UUID, openedAt time.Time) (cashSales, transferSales float64, ordersCount int, err error) {
	// 1. Obtener ventas en efectivo
	cashQuery := `SELECT COALESCE(SUM(total), 0), COALESCE(COUNT(id), 0) 
	              FROM orders 
	              WHERE status = 'pagado' AND payment_method = 'efectivo' AND cashier_id = $1 AND updated_at >= $2`
	
	var cashCount int
	err = r.db.QueryRow(cashQuery, cashierID, openedAt).Scan(&cashSales, &cashCount)
	if err != nil {
		return 0, 0, 0, err
	}

	// 2. Obtener ventas por transferencia
	transferQuery := `SELECT COALESCE(SUM(total), 0), COALESCE(COUNT(id), 0) 
	                  FROM orders 
	                  WHERE status = 'pagado' AND payment_method = 'transferencia' AND cashier_id = $1 AND updated_at >= $2`
	
	var transferCount int
	err = r.db.QueryRow(transferQuery, cashierID, openedAt).Scan(&transferSales, &transferCount)
	if err != nil {
		return 0, 0, 0, err
	}

	ordersCount = cashCount + transferCount
	return cashSales, transferSales, ordersCount, nil
}
