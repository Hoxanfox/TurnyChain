// =================================================================
// ARCHIVO: /internal/repository/order_repository.go (FINAL Y CORREGIDO)
// =================================================================
package repository

import (
	"database/sql"
	"errors"
	"strconv"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type OrderRepository interface {
	CreateOrder(order *domain.Order) (*domain.Order, error)
	GetOrders(filters map[string]interface{}) ([]domain.Order, error)
	GetOrderByID(orderID uuid.UUID) (*domain.Order, error)
	LinkOrderToParent(orderID, parentOrderID uuid.UUID) (*domain.Order, error)
	UpdateOrderStatus(orderID, userID uuid.UUID, status string) (*domain.Order, error)
	ManageOrder(orderID uuid.UUID, updates map[string]interface{}) (*domain.Order, error)
	UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem, newTotal float64) error
	AddPaymentProof(orderID uuid.UUID, method string, proofPath string) (*domain.Order, error)
	UpdateOrderPrintStatus(orderID uuid.UUID, status string, incrementAttempts int, lastError *string, printedAt *time.Time) (*domain.Order, error)
	UpdateOrderPrintStatusGuarded(orderID uuid.UUID, status string, incrementAttempts int, lastError *string, printedAt *time.Time, allowOverwritePrinted bool) (*domain.Order, bool, error)
	GetOrderIDsByPrintStatus(statuses []string) ([]uuid.UUID, error)
	GetRecoverableOrderIDsByPrintStatus(statuses []string, createdAfter *time.Time, lastAttemptAfter *time.Time) ([]uuid.UUID, error)
	GetRetryableFailedOrderIDs(createdAfter *time.Time, lastAttemptBefore time.Time, maxAttempts int, tableNumber *int) ([]uuid.UUID, error)
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
	orderQuery := `INSERT INTO orders (id, parent_order_id, waiter_id, table_id, table_number, status, total, order_type, customer_name, delivery_address, delivery_phone, delivery_notes, print_status, print_attempts) 
	               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
                   RETURNING id, created_at`
	err = tx.QueryRow(orderQuery, order.ID, order.ParentOrderID, order.WaiterID, order.TableID, order.TableNumber, order.Status, order.Total, order.OrderType, order.CustomerName, order.DeliveryAddress, order.DeliveryPhone, order.DeliveryNotes, "queued", 0).Scan(&order.ID, &order.CreatedAt)
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

	order.PrintStatus = "queued"
	order.PrintAttempts = 0

	// Obtener el nombre del mesero
	waiterQuery := `SELECT username FROM users WHERE id = $1`
	if err := r.db.QueryRow(waiterQuery, order.WaiterID).Scan(&order.WaiterName); err != nil {
		// Si no se puede obtener el nombre, no es un error crítico
		order.WaiterName = ""
	}

	return order, nil
}

func (r *orderRepository) GetOrders(filters map[string]interface{}) ([]domain.Order, error) {
	query := `SELECT o.id, o.parent_order_id, o.waiter_id, u.username as waiter_name, o.cashier_id, o.table_number, o.status, o.total, o.order_type, o.customer_name, o.delivery_address, o.delivery_phone, o.delivery_notes, o.payment_method, o.payment_proof_path, o.print_status, o.print_attempts, o.last_print_error, o.printed_at, o.last_print_attempt_at, o.created_at, o.updated_at 
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
		var parentOrderID sql.NullString
		var cashierID sql.NullString
		var waiterName sql.NullString
		var customerName sql.NullString
		var paymentMethod sql.NullString
		var paymentProof sql.NullString
		var printStatus sql.NullString
		var printAttempts sql.NullInt64
		var lastPrintError sql.NullString
		var printedAt sql.NullTime
		var lastPrintAttemptAt sql.NullTime
		var deliveryAddress sql.NullString
		var deliveryPhone sql.NullString
		var deliveryNotes sql.NullString
		if err := rows.Scan(&order.ID, &parentOrderID, &order.WaiterID, &waiterName, &cashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &customerName, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &printStatus, &printAttempts, &lastPrintError, &printedAt, &lastPrintAttemptAt, &order.CreatedAt, &order.UpdatedAt); err != nil {
			return nil, err
		}
		if parentOrderID.Valid {
			id, _ := uuid.Parse(parentOrderID.String)
			order.ParentOrderID = &id
		}
		if cashierID.Valid {
			id, _ := uuid.Parse(cashierID.String)
			order.CashierID = &id
		}
		if waiterName.Valid {
			order.WaiterName = waiterName.String
		}
		if customerName.Valid {
			name := customerName.String
			order.CustomerName = &name
		}
		if paymentMethod.Valid {
			pm := paymentMethod.String
			order.PaymentMethod = &pm
		}
		if paymentProof.Valid {
			pp := paymentProof.String
			order.PaymentProofPath = &pp
		}
		order.PrintStatus = "queued"
		if printStatus.Valid {
			order.PrintStatus = printStatus.String
		}
		if printAttempts.Valid {
			order.PrintAttempts = int(printAttempts.Int64)
		}
		if lastPrintError.Valid {
			errText := lastPrintError.String
			order.LastPrintError = &errText
		}
		if printedAt.Valid {
			t := printedAt.Time
			order.PrintedAt = &t
		}
		if lastPrintAttemptAt.Valid {
			t := lastPrintAttemptAt.Time
			order.LastPrintAttemptAt = &t
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
		SELECT oi.order_id, oi.menu_item_id, mi.name, oi.quantity, oi.price_at_order, oi.notes, oi.customizations, oi.is_takeout,
		       mi.category_id, c.station_id as category_station_id, s.name as category_station_name
		FROM order_items oi
		JOIN menu_items mi ON oi.menu_item_id = mi.id
		LEFT JOIN categories c ON mi.category_id = c.id
		LEFT JOIN stations s ON c.station_id = s.id
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
		var categoryID sql.NullString
		var categoryStationID sql.NullString
		var categoryStationName sql.NullString

		if err := itemRows.Scan(&orderID, &item.MenuItemID, &item.MenuItemName, &item.Quantity, &item.PriceAtOrder, &item.Notes, &item.Customizations, &item.IsTakeout, &categoryID, &categoryStationID, &categoryStationName); err != nil {
			return nil, err
		}

		// Convertir los campos nullable a punteros UUID
		if categoryID.Valid {
			cid, _ := uuid.Parse(categoryID.String)
			item.CategoryID = &cid
		}
		if categoryStationID.Valid {
			csid, _ := uuid.Parse(categoryStationID.String)
			item.CategoryStationID = &csid
		}
		if categoryStationName.Valid {
			item.CategoryStationName = categoryStationName.String
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
		SELECT oi.menu_item_id, mi.name, oi.quantity, oi.price_at_order, oi.notes, oi.customizations, oi.is_takeout,
		       mi.category_id, c.station_id as category_station_id, s.name as category_station_name
		FROM order_items oi
		JOIN menu_items mi ON oi.menu_item_id = mi.id
		LEFT JOIN categories c ON mi.category_id = c.id
		LEFT JOIN stations s ON c.station_id = s.id
		WHERE oi.order_id = $1`

	rows, err := r.db.Query(itemsQuery, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]domain.OrderItem, 0)
	for rows.Next() {
		var item domain.OrderItem
		var categoryID sql.NullString
		var categoryStationID sql.NullString
		var categoryStationName sql.NullString

		if err := rows.Scan(&item.MenuItemID, &item.MenuItemName, &item.Quantity, &item.PriceAtOrder, &item.Notes, &item.Customizations, &item.IsTakeout, &categoryID, &categoryStationID, &categoryStationName); err != nil {
			return nil, err
		}

		// Convertir los campos nullable a punteros UUID
		if categoryID.Valid {
			cid, _ := uuid.Parse(categoryID.String)
			item.CategoryID = &cid
		}
		if categoryStationID.Valid {
			csid, _ := uuid.Parse(categoryStationID.String)
			item.CategoryStationID = &csid
		}
		if categoryStationName.Valid {
			item.CategoryStationName = categoryStationName.String
		}

		items = append(items, item)
	}

	return items, nil
}

func (r *orderRepository) GetOrderByID(orderID uuid.UUID) (*domain.Order, error) {
	order := &domain.Order{}
	orderQuery := `SELECT o.id, o.parent_order_id, o.waiter_id, u.username as waiter_name, o.cashier_id, o.table_number, o.status, o.total, o.order_type, o.customer_name, o.delivery_address, o.delivery_phone, o.delivery_notes, o.payment_method, o.payment_proof_path, o.print_status, o.print_attempts, o.last_print_error, o.printed_at, o.last_print_attempt_at, o.created_at, o.updated_at 
	               FROM orders o
	               LEFT JOIN users u ON o.waiter_id = u.id
	               WHERE o.id = $1`
	var parentOrderID sql.NullString
	var waiterName sql.NullString
	var customerName sql.NullString
	var paymentMethod sql.NullString
	var paymentProof sql.NullString
	var printStatus sql.NullString
	var printAttempts sql.NullInt64
	var lastPrintError sql.NullString
	var printedAt sql.NullTime
	var lastPrintAttemptAt sql.NullTime
	var deliveryAddress sql.NullString
	var deliveryPhone sql.NullString
	var deliveryNotes sql.NullString
	err := r.db.QueryRow(orderQuery, orderID).Scan(&order.ID, &parentOrderID, &order.WaiterID, &waiterName, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &customerName, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &printStatus, &printAttempts, &lastPrintError, &printedAt, &lastPrintAttemptAt, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if parentOrderID.Valid {
		id, _ := uuid.Parse(parentOrderID.String)
		order.ParentOrderID = &id
	}
	if waiterName.Valid {
		order.WaiterName = waiterName.String
	}
	if customerName.Valid {
		name := customerName.String
		order.CustomerName = &name
	}
	if paymentMethod.Valid {
		pm := paymentMethod.String
		order.PaymentMethod = &pm
	}
	if paymentProof.Valid {
		pp := paymentProof.String
		order.PaymentProofPath = &pp
	}
	order.PrintStatus = "queued"
	if printStatus.Valid {
		order.PrintStatus = printStatus.String
	}
	if printAttempts.Valid {
		order.PrintAttempts = int(printAttempts.Int64)
	}
	if lastPrintError.Valid {
		errText := lastPrintError.String
		order.LastPrintError = &errText
	}
	if printedAt.Valid {
		t := printedAt.Time
		order.PrintedAt = &t
	}
	if lastPrintAttemptAt.Valid {
		t := lastPrintAttemptAt.Time
		order.LastPrintAttemptAt = &t
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

func (r *orderRepository) LinkOrderToParent(orderID, parentOrderID uuid.UUID) (*domain.Order, error) {
	if orderID == parentOrderID {
		return nil, errors.New("la orden no puede enlazarse consigo misma")
	}

	result, err := r.db.Exec(`UPDATE orders SET parent_order_id = $1 WHERE id = $2`, parentOrderID, orderID)
	if err != nil {
		return nil, err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, sql.ErrNoRows
	}

	return r.GetOrderByID(orderID)
}

func (r *orderRepository) UpdateOrderStatus(orderID, userID uuid.UUID, status string) (*domain.Order, error) {
	order := &domain.Order{}
	query := `UPDATE orders SET status = $1, cashier_id = $2 WHERE id = $3 
	          RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, print_status, print_attempts, last_print_error, printed_at, last_print_attempt_at, created_at, updated_at`

	var deliveryAddress sql.NullString
	var deliveryPhone sql.NullString
	var deliveryNotes sql.NullString
	var paymentMethod sql.NullString
	var paymentProof sql.NullString
	var printStatus sql.NullString
	var printAttempts sql.NullInt64
	var lastPrintError sql.NullString
	var printedAt sql.NullTime
	var lastPrintAttemptAt sql.NullTime

	err := r.db.QueryRow(query, status, userID, orderID).Scan(
		&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &printStatus, &printAttempts, &lastPrintError, &printedAt, &lastPrintAttemptAt, &order.CreatedAt, &order.UpdatedAt,
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
	order.PrintStatus = "queued"
	if printStatus.Valid {
		order.PrintStatus = printStatus.String
	}
	if printAttempts.Valid {
		order.PrintAttempts = int(printAttempts.Int64)
	}
	if lastPrintError.Valid {
		errText := lastPrintError.String
		order.LastPrintError = &errText
	}
	if printedAt.Valid {
		t := printedAt.Time
		order.PrintedAt = &t
	}
	if lastPrintAttemptAt.Valid {
		t := lastPrintAttemptAt.Time
		order.LastPrintAttemptAt = &t
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
		query := `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, print_status, print_attempts, last_print_error, printed_at, last_print_attempt_at, created_at, updated_at`

		var deliveryAddress sql.NullString
		var deliveryPhone sql.NullString
		var deliveryNotes sql.NullString
		var paymentMethod sql.NullString
		var paymentProof sql.NullString
		var printStatus sql.NullString
		var printAttempts sql.NullInt64
		var lastPrintError sql.NullString
		var printedAt sql.NullTime
		var lastPrintAttemptAt sql.NullTime

		err := r.db.QueryRow(query, status, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &printStatus, &printAttempts, &lastPrintError, &printedAt, &lastPrintAttemptAt, &order.CreatedAt, &order.UpdatedAt)
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
		order.PrintStatus = "queued"
		if printStatus.Valid {
			order.PrintStatus = printStatus.String
		}
		if printAttempts.Valid {
			order.PrintAttempts = int(printAttempts.Int64)
		}
		if lastPrintError.Valid {
			errText := lastPrintError.String
			order.LastPrintError = &errText
		}
		if printedAt.Valid {
			t := printedAt.Time
			order.PrintedAt = &t
		}
		if lastPrintAttemptAt.Valid {
			t := lastPrintAttemptAt.Time
			order.LastPrintAttemptAt = &t
		}
	}
	if hasWaiter {
		query := `UPDATE orders SET waiter_id = $1 WHERE id = $2 RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, print_status, print_attempts, last_print_error, printed_at, last_print_attempt_at, created_at, updated_at`

		var deliveryAddress sql.NullString
		var deliveryPhone sql.NullString
		var deliveryNotes sql.NullString
		var paymentMethod sql.NullString
		var paymentProof sql.NullString
		var printStatus sql.NullString
		var printAttempts sql.NullInt64
		var lastPrintError sql.NullString
		var printedAt sql.NullTime
		var lastPrintAttemptAt sql.NullTime

		err := r.db.QueryRow(query, waiterID, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &printStatus, &printAttempts, &lastPrintError, &printedAt, &lastPrintAttemptAt, &order.CreatedAt, &order.UpdatedAt)
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
		order.PrintStatus = "queued"
		if printStatus.Valid {
			order.PrintStatus = printStatus.String
		}
		if printAttempts.Valid {
			order.PrintAttempts = int(printAttempts.Int64)
		}
		if lastPrintError.Valid {
			errText := lastPrintError.String
			order.LastPrintError = &errText
		}
		if printedAt.Valid {
			t := printedAt.Time
			order.PrintedAt = &t
		}
		if lastPrintAttemptAt.Valid {
			t := lastPrintAttemptAt.Time
			order.LastPrintAttemptAt = &t
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
		          RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, print_status, print_attempts, last_print_error, printed_at, last_print_attempt_at, created_at, updated_at`
		var printStatus sql.NullString
		var printAttempts sql.NullInt64
		var lastPrintError sql.NullString
		var printedAt sql.NullTime
		var lastPrintAttemptAt sql.NullTime
		err = r.db.QueryRow(query, method, proofPath, newStatus, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &printStatus, &printAttempts, &lastPrintError, &printedAt, &lastPrintAttemptAt, &order.CreatedAt, &order.UpdatedAt)
		order.PrintStatus = "queued"
		if printStatus.Valid {
			order.PrintStatus = printStatus.String
		}
		if printAttempts.Valid {
			order.PrintAttempts = int(printAttempts.Int64)
		}
		if lastPrintError.Valid {
			errText := lastPrintError.String
			order.LastPrintError = &errText
		}
		if printedAt.Valid {
			t := printedAt.Time
			order.PrintedAt = &t
		}
		if lastPrintAttemptAt.Valid {
			t := lastPrintAttemptAt.Time
			order.LastPrintAttemptAt = &t
		}
	} else {
		// Sin comprobante (efectivo)
		query = `UPDATE orders SET payment_method = $1, status = $2 WHERE id = $3 
		          RETURNING id, waiter_id, cashier_id, table_number, status, total, order_type, delivery_address, delivery_phone, delivery_notes, payment_method, payment_proof_path, print_status, print_attempts, last_print_error, printed_at, last_print_attempt_at, created_at, updated_at`
		var printStatus sql.NullString
		var printAttempts sql.NullInt64
		var lastPrintError sql.NullString
		var printedAt sql.NullTime
		var lastPrintAttemptAt sql.NullTime
		err = r.db.QueryRow(query, method, newStatus, orderID).Scan(&order.ID, &order.WaiterID, &order.CashierID, &order.TableNumber, &order.Status, &order.Total, &order.OrderType, &deliveryAddress, &deliveryPhone, &deliveryNotes, &paymentMethod, &paymentProof, &printStatus, &printAttempts, &lastPrintError, &printedAt, &lastPrintAttemptAt, &order.CreatedAt, &order.UpdatedAt)
		order.PrintStatus = "queued"
		if printStatus.Valid {
			order.PrintStatus = printStatus.String
		}
		if printAttempts.Valid {
			order.PrintAttempts = int(printAttempts.Int64)
		}
		if lastPrintError.Valid {
			errText := lastPrintError.String
			order.LastPrintError = &errText
		}
		if printedAt.Valid {
			t := printedAt.Time
			order.PrintedAt = &t
		}
		if lastPrintAttemptAt.Valid {
			t := lastPrintAttemptAt.Time
			order.LastPrintAttemptAt = &t
		}
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

func (r *orderRepository) UpdateOrderPrintStatus(orderID uuid.UUID, status string, incrementAttempts int, lastError *string, printedAt *time.Time) (*domain.Order, error) {
	order, _, err := r.UpdateOrderPrintStatusGuarded(orderID, status, incrementAttempts, lastError, printedAt, true)
	return order, err
}

func (r *orderRepository) UpdateOrderPrintStatusGuarded(orderID uuid.UUID, status string, incrementAttempts int, lastError *string, printedAt *time.Time, allowOverwritePrinted bool) (*domain.Order, bool, error) {
	query := `
		UPDATE orders
		SET
			print_status = $1::varchar,
			print_attempts = COALESCE(print_attempts, 0) + GREATEST($2, 0),
			last_print_error = $3,
			printed_at = CASE
				WHEN $4::timestamptz IS NOT NULL THEN $4::timestamptz
				WHEN $1::varchar = 'printed'::varchar THEN printed_at
				ELSE NULL
			END,
			last_print_attempt_at = NOW()
		WHERE id = $5
		  AND ($6::boolean OR COALESCE(print_status, 'queued'::varchar) <> 'printed'::varchar)`

	result, err := r.db.Exec(query, status, incrementAttempts, lastError, printedAt, orderID, allowOverwritePrinted)
	if err != nil {
		return nil, false, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, false, err
	}

	order, err := r.GetOrderByID(orderID)
	if err != nil {
		return nil, false, err
	}

	return order, rowsAffected > 0, nil
}

func (r *orderRepository) GetOrderIDsByPrintStatus(statuses []string) ([]uuid.UUID, error) {
	return r.GetRecoverableOrderIDsByPrintStatus(statuses, nil, nil)
}

func (r *orderRepository) GetRecoverableOrderIDsByPrintStatus(statuses []string, createdAfter *time.Time, lastAttemptAfter *time.Time) ([]uuid.UUID, error) {
	query := `SELECT id FROM orders WHERE print_status = ANY($1)`
	args := []interface{}{pq.Array(statuses)}

	if createdAfter != nil && lastAttemptAfter != nil {
		query += ` AND (created_at >= $2 OR (last_print_attempt_at IS NOT NULL AND last_print_attempt_at >= $3))`
		args = append(args, *createdAfter, *lastAttemptAfter)
	} else if createdAfter != nil {
		query += ` AND created_at >= $2`
		args = append(args, *createdAfter)
	} else if lastAttemptAfter != nil {
		query += ` AND last_print_attempt_at IS NOT NULL AND last_print_attempt_at >= $2`
		args = append(args, *lastAttemptAfter)
	}

	query += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return ids, nil
}

func (r *orderRepository) GetRetryableFailedOrderIDs(createdAfter *time.Time, lastAttemptBefore time.Time, maxAttempts int, tableNumber *int) ([]uuid.UUID, error) {
	query := `
		SELECT id
		FROM orders
		WHERE print_status = 'failed'`

	args := make([]interface{}, 0)
	argID := 1

	if createdAfter != nil {
		query += ` AND created_at >= $` + strconv.Itoa(argID)
		args = append(args, *createdAfter)
		argID++
	}

	if maxAttempts > 0 {
		query += ` AND COALESCE(print_attempts, 0) < $` + strconv.Itoa(argID)
		args = append(args, maxAttempts)
		argID++
	}

	query += ` AND (last_print_attempt_at IS NULL OR last_print_attempt_at <= $` + strconv.Itoa(argID) + `)`
	args = append(args, lastAttemptBefore)
	argID++

	if tableNumber != nil {
		query += ` AND table_number = $` + strconv.Itoa(argID)
		args = append(args, *tableNumber)
		argID++
	}

	query += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return ids, nil
}
