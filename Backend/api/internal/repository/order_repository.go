// =================================================================
// ARCHIVO 2: /internal/repository/order_repository.go (ACTUALIZADO)
// =================================================================
package repository

import (
	"database/sql"
	"strconv" 
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
)

type OrderRepository interface {
	CreateOrder(order *domain.Order) (*domain.Order, error)
	GetOrders(filters map[string]interface{}) ([]domain.Order, error)
	GetOrderByID(orderID uuid.UUID) (*domain.Order, error)
	UpdateOrderStatus(orderID, userID uuid.UUID, status string) (*domain.Order, error)
	ManageOrder(orderID uuid.UUID, updates map[string]interface{}) (*domain.Order, error)
}

type orderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) CreateOrder(order *domain.Order) (*domain.Order, error) {
	tx, err := r.db.Begin()
	if err != nil { return nil, err }

	order.ID = uuid.New()
	orderQuery := `INSERT INTO orders (id, waiter_id, table_number, status, total) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`
	err = tx.QueryRow(orderQuery, order.ID, order.WaiterID, order.TableNumber, order.Status, order.Total).Scan(&order.ID, &order.CreatedAt)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	itemQuery := `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes) VALUES ($1, $2, $3, $4, $5)` // <-- ACTUALIZADO
	for _, item := range order.Items {
		_, err := tx.Exec(itemQuery, order.ID, item.MenuItemID, item.Quantity, item.PriceAtOrder, item.Notes) // <-- ACTUALIZADO
		if err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	return order, tx.Commit()
}

func (r *orderRepository) GetOrders(filters map[string]interface{}) ([]domain.Order, error) {
	query := "SELECT id, waiter_id, table_number, status, total, created_at FROM orders WHERE 1=1"
	args := []interface{}{}
	argId := 1

	if status, ok := filters["status"]; ok {
		// 2. CORRECCIÓN: Usamos strconv.Itoa() para convertir el número a string.
		query += " AND status = $" + strconv.Itoa(argId)
		args = append(args, status)
		argId++
	}
	if waiterID, ok := filters["waiter_id"]; ok {
		// 3. CORRECCIÓN: Usamos strconv.Itoa() aquí también.
		query += " AND waiter_id = $" + strconv.Itoa(argId)
		args = append(args, waiterID)
		argId++
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.Order
	for rows.Next() {
		var order domain.Order
		if err := rows.Scan(&order.ID, &order.WaiterID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt); err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}
	return orders, nil
}

func (r *orderRepository) GetOrderByID(orderID uuid.UUID) (*domain.Order, error) {
	order := &domain.Order{}
	orderQuery := "SELECT id, waiter_id, cashier_id, table_number, status, total, created_at, updated_at FROM orders WHERE id = $1"
	err := r.db.QueryRow(orderQuery, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return nil, err
	}

	itemsQuery := "SELECT menu_item_id, quantity, price_at_order, notes FROM order_items WHERE order_id = $1"
	rows, err := r.db.Query(itemsQuery, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item domain.OrderItem
		if err := rows.Scan(&item.MenuItemID, &item.Quantity, &item.PriceAtOrder, &item.Notes); err != nil {
			return nil, err
		}
		order.Items = append(order.Items, item)
	}

	return order, nil
}

func (r *orderRepository) UpdateOrderStatus(orderID, userID uuid.UUID, status string) (*domain.Order, error) {
	order := &domain.Order{}
	query := `UPDATE orders SET status = $1, cashier_id = $2 WHERE id = $3 RETURNING id, waiter_id, cashier_id, table_number, status, total, created_at, updated_at`
	err := r.db.QueryRow(query, status, userID, orderID).Scan(
		&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt,
	)
	return order, err
}

// ManageOrder permite al admin cancelar o reasignar una orden.
func (r *orderRepository) ManageOrder(orderID uuid.UUID, updates map[string]interface{}) (*domain.Order, error) {
	order := &domain.Order{}
	status, hasStatus := updates["status"]
	waiterID, hasWaiter := updates["waiter_id"]
	
	if hasStatus {
		query := `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, created_at, updated_at`
		err := r.db.QueryRow(query, status, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt)
		return order, err
	}
	if hasWaiter {
		query := `UPDATE orders SET waiter_id = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, created_at, updated_at`
		err := r.db.QueryRow(query, waiterID, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt)
		return order, err
	}
	return nil, sql.ErrNoRows
}
