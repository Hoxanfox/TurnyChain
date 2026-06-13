// =================================================================
// ARCHIVO 2: /cmd/api/main.go (FINAL)
// =================================================================
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/middleware"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/router"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	_ "github.com/lib/pq"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "user=postgres password=1234 dbname=restaurant_db host=localhost sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error al conectar a la base de datos: %v", err)
	}
	defer db.Close()

	if err := applyOrderSchemaMigrations(db); err != nil {
		log.Fatalf("Error aplicando migraciones de órdenes: %v", err)
	}
	if err := applyAuthSessionMigrations(db); err != nil {
		log.Fatalf("Error aplicando migraciones de sesiones: %v", err)
	}
	if err := applyOrderPaymentsMigration(db); err != nil {
		log.Fatalf("Error aplicando migraciones de order_payments: %v", err)
	}
	if err := applyCashRegisterMigrations(db); err != nil {
		log.Fatalf("Error aplicando migraciones de caja: %v", err)
	}

	wsHub := wshub.NewHub()
	go wsHub.Run()

	// --- INICIALIZAR BLOCKCHAIN ---
	rpcURL := os.Getenv("BLOCKCHAIN_RPC_URL")
	privateKey := os.Getenv("WALLET_PRIVATE_KEY")
	contractAddr := os.Getenv("CONTRACT_ADDRESS")

	// Creamos el servicio (si faltan variables, devolverá nil y logs de advertencia, pero no crashea)
	blockchainService := service.NewBlockchainService(rpcURL, privateKey, contractAddr)
	// -----------------------------

	// Repositorios
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	menuRepo := repository.NewMenuRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	tableRepo := repository.NewTableRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	ingredientRepo := repository.NewIngredientRepository(db)
	accompanimentRepo := repository.NewAccompanimentRepository(db)
	stationRepo := repository.NewStationRepository(db)
	printerRepo := repository.NewPrinterRepository(db)
	cashRegisterRepo := repository.NewCashRegisterRepository(db)
	settingRepo := repository.NewSettingRepository(db)

	// Servicios
	userService := service.NewUserService(userRepo, sessionRepo)
	authService := service.NewAuthService(userRepo, sessionRepo)
	menuService := service.NewMenuService(menuRepo, wsHub)

	kitchenTicketService := service.NewKitchenTicketService(orderRepo, printerRepo, stationRepo, wsHub)
	orderService := service.NewOrderService(orderRepo, tableRepo, menuRepo, ingredientRepo, accompanimentRepo, wsHub, blockchainService, kitchenTicketService)
	invoiceService := service.NewInvoiceService(orderRepo)
	tableService := service.NewTableService(tableRepo)
	categoryService := service.NewCategoryService(categoryRepo)
	ingredientService := service.NewIngredientService(ingredientRepo)
	accompanimentService := service.NewAccompanimentService(accompanimentRepo)
	stationService := service.NewStationService(stationRepo)
	printerService := service.NewPrinterService(printerRepo)
	backupService := service.NewBackupService(db)
	cashRegisterService := service.NewCashRegisterService(cashRegisterRepo)
	settingService := service.NewSettingService(settingRepo)

	// Handlers
	userHandler := handler.NewUserHandler(userService)
	authHandler := handler.NewAuthHandler(authService)
	menuHandler := handler.NewMenuHandler(menuService)
	orderHandler := handler.NewOrderHandler(orderService)
	invoiceHandler := handler.NewInvoiceHandler(invoiceService)
	tableHandler := handler.NewTableHandler(tableService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	ingredientHandler := handler.NewIngredientHandler(ingredientService)
	accompanimentHandler := handler.NewAccompanimentHandler(accompanimentService)
	wsHandler := handler.NewWebSocketHandler(wsHub, sessionRepo)
	stationHandler := handler.NewStationHandler(stationService)
	printerHandler := handler.NewPrinterHandler(printerService)
	kitchenTicketHandler := handler.NewKitchenTicketHandler(kitchenTicketService)
	backupHandler := handler.NewBackupHandler(backupService)
	cashRegisterHandler := handler.NewCashRegisterHandler(cashRegisterService)
	settingHandler := handler.NewSettingHandler(settingService)

	app := fiber.New(fiber.Config{
		BodyLimit: 20 * 1024 * 1024, // 20 MB max file size
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			if code >= fiber.StatusInternalServerError {
				wsHub.BroadcastToRole("admin", "BACKEND_ERROR_LOG", fiber.Map{
					"timestamp": time.Now().UTC().Format(time.RFC3339),
					"path":      c.Path(),
					"method":    c.Method(),
					"status":    code,
					"message":   err.Error(),
				})
			}

			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})
	app.Use(cors.New())
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
		StackTraceHandler: func(c *fiber.Ctx, e interface{}) {
			panicText := fmt.Sprintf("panic recovered: %v", e)
			wsHub.BroadcastToRole("admin", "BACKEND_ERROR_LOG", fiber.Map{
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"path":      c.Path(),
				"method":    c.Method(),
				"status":    fiber.StatusInternalServerError,
				"message":   panicText,
			})
		},
	}))
	app.Use(middleware.BackendErrorNotifier(wsHub))

	// Servir archivos estáticos de uploads en /api/static (SIN autenticación)
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		log.Fatalf("No se pudo crear carpeta uploads: %v", err)
	}
	app.Static("/api/static", uploadsDir)

	router.SetupRoutes(app, authHandler, userHandler, menuHandler, orderHandler, invoiceHandler, tableHandler, categoryHandler, ingredientHandler, accompanimentHandler, wsHandler, stationHandler, printerHandler, kitchenTicketHandler, backupHandler, cashRegisterHandler, settingHandler, sessionRepo)

	// Alias explícitos para compatibilidad de rutas de impresión de cocina.
	app.Post("/api/orders/:orderId/kitchen-tickets/print/caja", middleware.Protected(sessionRepo), kitchenTicketHandler.PrintGlobalCashTicket)
	app.Post("/api/orders/:orderId/kitchen-tickets/retry", middleware.Protected(sessionRepo), kitchenTicketHandler.RetryKitchenTicketsPrint)
	app.Post("/api/orders/kitchen-tickets/retry-failed-recent", middleware.Protected(sessionRepo), kitchenTicketHandler.RetryRecentFailedKitchenTickets)

	// Alias explícitos para compatibilidad de rutas de backup.
	app.Get("/api/backups/catalog", middleware.Protected(sessionRepo), backupHandler.ExportCatalogBackup)
	app.Post("/api/backups/catalog/import", middleware.Protected(sessionRepo), backupHandler.ImportCatalogBackup)
	app.Post("/api/backup/catalog/import", middleware.Protected(sessionRepo), backupHandler.ImportCatalogBackup)
	app.Post("/api/backup/catalog", middleware.Protected(sessionRepo), backupHandler.ImportCatalogBackup)

	for _, route := range app.GetRoutes() {
		if strings.Contains(route.Path, "backup") {
			log.Printf("[route] %s %s", route.Method, route.Path)
		}
	}

	log.Println("Iniciando servidor en el puerto 8080...")
	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("Error al iniciar el servidor: %v", err)
	}
}

func applyOrderSchemaMigrations(db *sql.DB) error {
	statements := []string{
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id uuid REFERENCES orders(id) ON DELETE SET NULL`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name varchar(255) NULL`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS blockchain_tx_hash text NULL`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_status varchar(20) NOT NULL DEFAULT 'queued'`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_attempts integer NOT NULL DEFAULT 0`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_print_error text NULL`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS printed_at timestamptz NULL`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_print_attempt_at timestamptz NULL`,
		`UPDATE orders SET print_status = 'queued' WHERE print_status IS NULL`,
		`UPDATE orders SET print_status = 'queued' WHERE print_status = 'pending'`,
		`UPDATE orders SET print_status = 'printing' WHERE print_status = 'processing'`,
		`CREATE INDEX IF NOT EXISTS orders_parent_order_id_idx ON orders (parent_order_id)`,
		`CREATE INDEX IF NOT EXISTS orders_print_status_idx ON orders (print_status)`,
		`CREATE INDEX IF NOT EXISTS orders_blockchain_tx_hash_idx ON orders (blockchain_tx_hash)`,
		`CREATE INDEX IF NOT EXISTS orders_updated_at_idx ON orders (updated_at)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	log.Println("Migraciones de órdenes verificadas: parent_order_id/customer_name/print_status")
	return nil
}

func applyAuthSessionMigrations(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS user_sessions (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			device_id varchar(100) NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			expires_at timestamptz NOT NULL,
			revoked_at timestamptz NULL,
			revoked_reason text NULL
		)`,
		`CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id)`,
		`CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions (expires_at)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_user_id_active_idx ON user_sessions (user_id) WHERE revoked_at IS NULL`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	log.Println("Migraciones de sesiones verificadas: user_sessions")
	return nil
}

func applyOrderPaymentsMigration(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS order_payments (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
			amount numeric(10, 2) NOT NULL,
			payment_method varchar(20) NOT NULL CHECK (payment_method IN ('efectivo', 'transferencia')),
			payment_proof_path text NULL,
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS order_payments_order_id_idx ON order_payments (order_id)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	log.Println("Migraciones de pagos divididos verificadas: order_payments")
	return nil
}

func applyCashRegisterMigrations(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS cash_register_sessions (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			status varchar(20) NOT NULL CHECK (status IN ('open', 'closed')),
			open_time timestamptz NOT NULL DEFAULT now(),
			close_time timestamptz NULL,
			initial_cash numeric(12, 2) NOT NULL DEFAULT 0,
			final_cash_expected numeric(12, 2) NULL,
			final_cash_actual numeric(12, 2) NULL,
			discrepancy numeric(12, 2) NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS cash_register_expenses (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			session_id uuid NOT NULL REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
			amount numeric(12, 2) NOT NULL,
			description text NOT NULL,
			image_path text NULL,
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS final_transfer_expected numeric(12, 2) NULL`,
		`ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS final_transfer_actual numeric(12, 2) NULL`,
		`ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS transfer_discrepancy numeric(12, 2) NULL`,
		`ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS initial_transfer numeric(12, 2) NOT NULL DEFAULT 0`,
		`CREATE INDEX IF NOT EXISTS cash_register_sessions_status_idx ON cash_register_sessions (status)`,
		`CREATE INDEX IF NOT EXISTS cash_register_expenses_session_id_idx ON cash_register_expenses (session_id)`,
		`CREATE TABLE IF NOT EXISTS settings (
			key varchar(50) PRIMARY KEY,
			value text NOT NULL,
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	log.Println("Migraciones de caja verificadas: cash_register_sessions, cash_register_expenses")
	return nil
}
