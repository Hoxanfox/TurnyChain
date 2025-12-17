// =================================================================
// ARCHIVO: /internal/repository/order_repository.go (FINAL Y CORREGIDO)
// =================================================================
package repository

import (
	"database/sql"
	"strconv"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type OrderRepository interface {
	CreateOrder(order *domain.Order) (*domain.Order, error)
	GetOrders(filters map[string]interface{}) ([]domain.Order, error)
	GetOrderByID(orderID uuid.UUID) (*domain.Order, error)
	UpdateOrderStatus(orderID, userID uuid.UUID, status string) (*domain.Order, error)
	ManageOrder(orderID uuid.UUID, updates map[string]interface{}) (*domain.Order, error)
	UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem, newTotal float64) error
}

type orderRepository struct{ db *sql.DB }

func NewOrderRepository(db *sql.DB) OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) CreateOrder(order *domain.Order) (*domain.Order, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}

	order.ID = uuid.New()
	orderQuery := `INSERT INTO orders (id, waiter_id, table_id, table_number, status, total) 
                   VALUES ($1, $2, $3, $4, $5, $6) 
                   RETURNING id, created_at`
	err = tx.QueryRow(orderQuery, order.ID, order.WaiterID, order.TableID, order.TableNumber, order.Status, order.Total).Scan(&order.ID, &order.CreatedAt)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	itemQuery := `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes, customizations) 
                  VALUES ($1, $2, $3, $4, $5, $6)`
	for _, item := range order.Items {
		_, err := tx.Exec(itemQuery, order.ID, item.MenuItemID, item.Quantity, item.PriceAtOrder, item.Notes, item.Customizations)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Obtener el nombre del mesero
	waiterQuery := `SELECT username FROM users WHERE id = $1`
	if err := r.db.QueryRow(waiterQuery, order.WaiterID).Scan(&order.WaiterName); err != nil {
		// Si no se puede obtener el nombre, no es un error crítico
		order.WaiterName = ""
	}

	return order, nil
}

func (r *orderRepository) GetOrders(filters map[string]interface{}) ([]domain.Order, error) {
	query := `SELECT o.id, o.waiter_id, u.username as waiter_name, o.cashier_id, o.table_number, o.status, o.total, o.created_at, o.updated_at 
              FROM orders o
              LEFT JOIN users u ON o.waiter_id = u.id
              WHERE 1=1`
	args := []interface{}{}
	argId := 1

	if status, ok := filters["status"]; ok {
		query += " AND o.status = $" + strconv.Itoa(argId)
		args = append(args, status)
		argId++
	}
	if waiterID, ok := filters["waiter_id"]; ok {
		query += " AND o.waiter_id = $" + strconv.Itoa(argId)
		args = append(args, waiterID)
		argId++
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ordersMap := make(map[uuid.UUID]*domain.Order)
	var orderIDs []uuid.UUID

	for rows.Next() {
		var order domain.Order
		var cashierID sql.NullString
		var waiterName sql.NullString
		if err := rows.Scan(&order.ID, &order.WaiterID, &waiterName, &cashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt); err != nil {
			return nil, err
		}
		if cashierID.Valid {
			id, _ := uuid.Parse(cashierID.String)
			order.CashierID = &id
		}
		if waiterName.Valid {
			order.WaiterName = waiterName.String
		}
		ordersMap[order.ID] = &order
		orderIDs = append(orderIDs, order.ID)
	}

	if len(orderIDs) == 0 {
		return []domain.Order{}, nil
	}

	itemsQuery := `
		SELECT oi.order_id, oi.menu_item_id, mi.name, oi.quantity, oi.price_at_order, oi.notes, oi.customizations
		FROM order_items oi
		JOIN menu_items mi ON oi.menu_item_id = mi.id
		WHERE oi.order_id = ANY($1)`

	// 3. CORRECCIÓN: Usamos pq.Array para pasar la lista de IDs a la consulta.
	itemRows, err := r.db.Query(itemsQuery, pq.Array(orderIDs))
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var item domain.OrderItem
		var orderID uuid.UUID
		if err := itemRows.Scan(&orderID, &item.MenuItemID, &item.MenuItemName, &item.Quantity, &item.PriceAtOrder, &item.Notes, &item.Customizations); err != nil {
			return nil, err
		}
		if order, ok := ordersMap[orderID]; ok {
			order.Items = append(order.Items, item)
		}
	}

	finalOrders := make([]domain.Order, 0, len(ordersMap))
	for _, order := range ordersMap {
		finalOrders = append(finalOrders, *order)
	}

	return finalOrders, nil
}

func (r *orderRepository) GetOrderByID(orderID uuid.UUID) (*domain.Order, error) {
	order := &domain.Order{}
	orderQuery := `SELECT o.id, o.waiter_id, u.username as waiter_name, o.cashier_id, o.table_number, o.status, o.total, o.created_at, o.updated_at 
	               FROM orders o
	               LEFT JOIN users u ON o.waiter_id = u.id
	               WHERE o.id = $1`
	var waiterName sql.NullString
	err := r.db.QueryRow(orderQuery, orderID).Scan(&order.ID, &order.WaiterID, &waiterName, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if waiterName.Valid {
		order.WaiterName = waiterName.String
	}

	itemsQuery := `
		SELECT oi.menu_item_id, mi.name, oi.quantity, oi.price_at_order, oi.notes, oi.customizations
		FROM order_items oi
		JOIN menu_items mi ON oi.menu_item_id = mi.id
		WHERE oi.order_id = $1`

	rows, err := r.db.Query(itemsQuery, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.OrderItem, 0)
	for rows.Next() {
		var item domain.OrderItem
		if err := rows.Scan(&item.MenuItemID, &item.MenuItemName, &item.Quantity, &item.PriceAtOrder, &item.Notes, &item.Customizations); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	order.Items = items

	return order, nil
}

func (r *orderRepository) UpdateOrderStatus(orderID, userID uuid.UUID, status string) (*domain.Order, error) {
	order := &domain.Order{}
	query := `UPDATE orders SET status = $1, cashier_id = $2 WHERE id = $3 
	          RETURNING id, waiter_id, cashier_id, table_number, status, total, created_at, updated_at`
	err := r.db.QueryRow(query, status, userID, orderID).Scan(
		&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Obtener el nombre del mesero
	waiterQuery := `SELECT username FROM users WHERE id = $1`
	if err := r.db.QueryRow(waiterQuery, order.WaiterID).Scan(&order.WaiterName); err != nil {
		order.WaiterName = ""
	}

	return order, nil
}

func (r *orderRepository) ManageOrder(orderID uuid.UUID, updates map[string]interface{}) (*domain.Order, error) {
	order := &domain.Order{}
	status, hasStatus := updates["status"]
	waiterID, hasWaiter := updates["waiter_id"]

	if hasStatus {
		query := `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, created_at, updated_at`
		err := r.db.QueryRow(query, status, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt)
		if err != nil {
			return nil, err
		}
	}
	if hasWaiter {
		query := `UPDATE orders SET waiter_id = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, created_at, updated_at`
		err := r.db.QueryRow(query, waiterID, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.CreatedAt, &order.UpdatedAt)
		if err != nil {
			return nil, err
		}
	}

	if order.ID == uuid.Nil {
		return nil, sql.ErrNoRows
	}

	// Obtener el nombre del mesero
	waiterQuery := `SELECT username FROM users WHERE id = $1`
	if err := r.db.QueryRow(waiterQuery, order.WaiterID).Scan(&order.WaiterName); err != nil {
		order.WaiterName = ""
	}

	return order, nil
}

func (r *orderRepository) UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem, newTotal float64) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}

	_, err = tx.Exec("DELETE FROM order_items WHERE order_id = $1", orderID)
	if err != nil {
		tx.Rollback()
		return err
	}

	itemQuery := `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes, customizations) VALUES ($1, $2, $3, $4, $5, $6)`
	for _, item := range items {
		_, err := tx.Exec(itemQuery, orderID, item.MenuItemID, item.Quantity, item.PriceAtOrder, item.Notes, item.Customizations)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	_, err = tx.Exec("UPDATE orders SET total = $1 WHERE id = $2", newTotal, orderID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
