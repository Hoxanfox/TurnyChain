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
	AddPaymentProof(orderID uuid.UUID, method string, proofPath string) (*domain.Order, error)
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
	orderQuery := `INSERT INTO orders (id, waiter_id, table_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                   RETURNING id, created_at`
	err = tx.QueryRow(orderQuery, order.ID, order.WaiterID, order.TableID, order.TableNumber, order.Status, order.Total, order.OrderType, order.DeliveryAddress, order.DeliveryPhone, order.DeliveryNotes).Scan(&order.ID, &order.CreatedAt)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	itemQuery := `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes, customizations, is_takeout) 
                  VALUES ($1, $2, $3, $4, $5, $6, $7)`
	for _, item := range order.Items {
		_, err := tx.Exec(itemQuery, order.ID, item.MenuItemID, item.Quantity, item.PriceAtOrder, item.Notes, item.Customizations, item.IsTakeout)
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
	query := `SELECT o.id, o.waiter_id, u.username as waiter_name, o.cashier_id, o.table_number, o.status, o.total, o.order_type, o.delivery_address, o.delivery_phone, o.delivery_notes, o.payment_method, o.payment_proof_path, o.created_at, o.updated_at 
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
		var paymentMethod sql.NullString
		var paymentProof sql.NullString
		var deliveryAddress sql.NullString
		var deliveryPhone sql.NullString
		var deliveryNotes sql.NullString
		if err := rows.Scan(&order.ID, &order.WaiterID, &waiterName, &cashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &order.CreatedAt, &order.UpdatedAt); err != nil {
			return nil, err
		}
		if cashierID.Valid {
			id, _ := uuid.Parse(cashierID.String)
			order.CashierID = &id
		}
		if waiterName.Valid {
			order.WaiterName = waiterName.String
		}
		if paymentMethod.Valid {
			pm := paymentMethod.String
			order.PaymentMethod = &pm
		}
		if paymentProof.Valid {
			pp := paymentProof.String
			order.PaymentProofPath = &pp
		}
		if deliveryAddress.Valid {
			addr := deliveryAddress.String
			order.DeliveryAddress = &addr
		}
		if deliveryPhone.Valid {
			phone := deliveryPhone.String
			order.DeliveryPhone = &phone
		}
		if deliveryNotes.Valid {
			notes := deliveryNotes.String
			order.DeliveryNotes = &notes
		}
		ordersMap[order.ID] = &order
		orderIDs = append(orderIDs, order.ID)
	}

	if len(orderIDs) == 0 {
		return []domain.Order{}, nil
	}

	itemsQuery := `
		SELECT oi.order_id, oi.menu_item_id, mi.name, oi.quantity, oi.price_at_order, oi.notes, oi.customizations, oi.is_takeout
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
		if err := itemRows.Scan(&orderID, &item.MenuItemID, &item.MenuItemName, &item.Quantity, &item.PriceAtOrder, &item.Notes, &item.Customizations, &item.IsTakeout); err != nil {
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

// loadOrderItems es un método auxiliar privado que carga los items de una orden
// IMPORTANTE: Este método asegura que SIEMPRE se carguen los items antes de enviar por WebSocket
func (r *orderRepository) loadOrderItems(orderID uuid.UUID) ([]domain.OrderItem, error) {
	itemsQuery := `
		SELECT oi.menu_item_id, mi.name, oi.quantity, oi.price_at_order, oi.notes, oi.customizations, oi.is_takeout
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
		if err := rows.Scan(&item.MenuItemID, &item.MenuItemName, &item.Quantity, &item.PriceAtOrder, &item.Notes, &item.Customizations, &item.IsTakeout); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *orderRepository) GetOrderByID(orderID uuid.UUID) (*domain.Order, error) {
	order := &domain.Order{}
	orderQuery := `SELECT o.id, o.waiter_id, u.username as waiter_name, o.cashier_id, o.table_number, o.status, o.total, o.order_type, o.delivery_address, o.delivery_phone, o.delivery_notes, o.payment_method, o.payment_proof_path, o.created_at, o.updated_at 
	               FROM orders o
	               LEFT JOIN users u ON o.waiter_id = u.id
	               WHERE o.id = $1`
	var waiterName sql.NullString
	var paymentMethod sql.NullString
	var paymentProof sql.NullString
	var deliveryAddress sql.NullString
	var deliveryPhone sql.NullString
	var deliveryNotes sql.NullString
	err := r.db.QueryRow(orderQuery, orderID).Scan(&order.ID, &order.WaiterID, &waiterName, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if waiterName.Valid {
		order.WaiterName = waiterName.String
	}
	if paymentMethod.Valid {
		pm := paymentMethod.String
		order.PaymentMethod = &pm
	}
	if paymentProof.Valid {
		pp := paymentProof.String
		order.PaymentProofPath = &pp
	}
	if deliveryAddress.Valid {
		addr := deliveryAddress.String
		order.DeliveryAddress = &addr
	}
	if deliveryPhone.Valid {
		phone := deliveryPhone.String
		order.DeliveryPhone = &phone
	}
	if deliveryNotes.Valid {
		notes := deliveryNotes.String
		order.DeliveryNotes = &notes
	}

	// Usar el método auxiliar para cargar items
	items, err := r.loadOrderItems(orderID)
	if err != nil {
		return nil, err
	}
	order.Items = items

	return order, nil
}

func (r *orderRepository) UpdateOrderStatus(orderID, userID uuid.UUID, status string) (*domain.Order, error) {
	order := &domain.Order{}
	query := `UPDATE orders SET status = $1, cashier_id = $2 WHERE id = $3 
	          RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, created_at, updated_at`

	var deliveryAddress sql.NullString
	var deliveryPhone sql.NullString
	var deliveryNotes sql.NullString
	var paymentMethod sql.NullString
	var paymentProof sql.NullString

	err := r.db.QueryRow(query, status, userID, orderID).Scan(
		&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if deliveryAddress.Valid {
		addr := deliveryAddress.String
		order.DeliveryAddress = &addr
	}
	if deliveryPhone.Valid {
		phone := deliveryPhone.String
		order.DeliveryPhone = &phone
	}
	if deliveryNotes.Valid {
		notes := deliveryNotes.String
		order.DeliveryNotes = &notes
	}
	if paymentMethod.Valid {
		pm := paymentMethod.String
		order.PaymentMethod = &pm
	}
	if paymentProof.Valid {
		pp := paymentProof.String
		order.PaymentProofPath = &pp
	}

	// Obtener el nombre del mesero
	waiterQuery := `SELECT username FROM users WHERE id = $1`
	if err := r.db.QueryRow(waiterQuery, order.WaiterID).Scan(&order.WaiterName); err != nil {
		order.WaiterName = ""
	}

	// 🔧 CORRECCIÓN: Cargar items antes de devolver la orden
	// Esto asegura que los eventos WebSocket SIEMPRE incluyan los items
	items, err := r.loadOrderItems(orderID)
	if err != nil {
		// Log del error pero no falla la operación
		// Ya que el update del status sí se completó
		return nil, err
	}
	order.Items = items

	return order, nil
}

func (r *orderRepository) ManageOrder(orderID uuid.UUID, updates map[string]interface{}) (*domain.Order, error) {
	order := &domain.Order{}
	status, hasStatus := updates["status"]
	waiterID, hasWaiter := updates["waiter_id"]

	if hasStatus {
		query := `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, created_at, updated_at`

		var deliveryAddress sql.NullString
		var deliveryPhone sql.NullString
		var deliveryNotes sql.NullString
		var paymentMethod sql.NullString
		var paymentProof sql.NullString

		err := r.db.QueryRow(query, status, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &order.CreatedAt, &order.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if deliveryAddress.Valid {
			addr := deliveryAddress.String
			order.DeliveryAddress = &addr
		}
		if deliveryPhone.Valid {
			phone := deliveryPhone.String
			order.DeliveryPhone = &phone
		}
		if deliveryNotes.Valid {
			notes := deliveryNotes.String
			order.DeliveryNotes = &notes
		}
		if paymentMethod.Valid {
			pm := paymentMethod.String
			order.PaymentMethod = &pm
		}
		if paymentProof.Valid {
			pp := paymentProof.String
			order.PaymentProofPath = &pp
		}
	}
	if hasWaiter {
		query := `UPDATE orders SET waiter_id = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, created_at, updated_at`

		var deliveryAddress sql.NullString
		var deliveryPhone sql.NullString
		var deliveryNotes sql.NullString
		var paymentMethod sql.NullString
		var paymentProof sql.NullString

		err := r.db.QueryRow(query, waiterID, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &order.CreatedAt, &order.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if deliveryAddress.Valid {
			addr := deliveryAddress.String
			order.DeliveryAddress = &addr
		}
		if deliveryPhone.Valid {
			phone := deliveryPhone.String
			order.DeliveryPhone = &phone
		}
		if deliveryNotes.Valid {
			notes := deliveryNotes.String
			order.DeliveryNotes = &notes
		}
		if paymentMethod.Valid {
			pm := paymentMethod.String
			order.PaymentMethod = &pm
		}
		if paymentProof.Valid {
			pp := paymentProof.String
			order.PaymentProofPath = &pp
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

	// 🔧 CORRECCIÓN: Cargar items antes de devolver la orden
	// Esto asegura que los eventos WebSocket SIEMPRE incluyan los items
	items, err := r.loadOrderItems(orderID)
	if err != nil {
		return nil, err
	}
	order.Items = items

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

	itemQuery := `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes, customizations, is_takeout) VALUES ($1, $2, $3, $4, $5, $6, $7)`
	for _, item := range items {
		_, err := tx.Exec(itemQuery, orderID, item.MenuItemID, item.Quantity, item.PriceAtOrder, item.Notes, item.Customizations, item.IsTakeout)
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

func (r *orderRepository) AddPaymentProof(orderID uuid.UUID, method string, proofPath string) (*domain.Order, error) {
	order := &domain.Order{}

	// Determinar el nuevo estado según el método de pago
	var newStatus string
	if method == "efectivo" {
		// Para efectivo, puede ir directo a 'pagado' o 'por_verificar' según tu lógica de negocio
		// Voy a asumir que efectivo necesita verificación también
		newStatus = "por_verificar"
	} else {
		// Para transferencia, requiere verificación
		newStatus = "por_verificar"
	}

	var query string
	var err error
	var deliveryAddress sql.NullString
	var deliveryPhone sql.NullString
	var deliveryNotes sql.NullString
	var paymentMethod sql.NullString
	var paymentProof sql.NullString

	if proofPath != "" {
		// Con comprobante
		query = `UPDATE orders SET payment_method = $1, payment_proof_path = $2, status = $3 WHERE id = $4 
		          RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, created_at, updated_at`
		err = r.db.QueryRow(query, method, proofPath, newStatus, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &order.CreatedAt, &order.UpdatedAt)
	} else {
		// Sin comprobante (efectivo)
		query = `UPDATE orders SET payment_method = $1, status = $2 WHERE id = $3 
		          RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, created_at, updated_at`
		err = r.db.QueryRow(query, method, newStatus, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &order.CreatedAt, &order.UpdatedAt)
	}

	if err != nil {
		return nil, err
	}

	if deliveryAddress.Valid {
		addr := deliveryAddress.String
		order.DeliveryAddress = &addr
	}
	if deliveryPhone.Valid {
		phone := deliveryPhone.String
		order.DeliveryPhone = &phone
	}
	if deliveryNotes.Valid {
		notes := deliveryNotes.String
		order.DeliveryNotes = &notes
	}
	if paymentMethod.Valid {
		pm := paymentMethod.String
		order.PaymentMethod = &pm
	}
	if paymentProof.Valid {
		pp := paymentProof.String
		order.PaymentProofPath = &pp
	}

	// Obtener el nombre del mesero
	waiterQuery := `SELECT username FROM users WHERE id = $1`
	if err := r.db.QueryRow(waiterQuery, order.WaiterID).Scan(&order.WaiterName); err != nil {
		order.WaiterName = ""
	}

	// 🔧 CORRECCIÓN CRÍTICA: Cargar items antes de devolver la orden
	// Esto evita el error "TypeError: can't access property 'slice', S.items is null"
	// que ocurría cuando el frontend recibía la orden sin items por WebSocket
	items, err := r.loadOrderItems(orderID)
	if err != nil {
		return nil, err
	}
	order.Items = items

	return order, nil
}
