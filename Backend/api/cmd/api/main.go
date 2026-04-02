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
	menuRepo := repository.NewMenuRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	tableRepo := repository.NewTableRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	ingredientRepo := repository.NewIngredientRepository(db)
	accompanimentRepo := repository.NewAccompanimentRepository(db)
	stationRepo := repository.NewStationRepository(db)
	printerRepo := repository.NewPrinterRepository(db)

	// Servicios
	userService := service.NewUserService(userRepo)
	authService := service.NewAuthService(userRepo)
	menuService := service.NewMenuService(menuRepo, wsHub)

	kitchenTicketService := service.NewKitchenTicketService(orderRepo, printerRepo, stationRepo, wsHub)
	orderService := service.NewOrderService(orderRepo, tableRepo, menuRepo, ingredientRepo, accompanimentRepo, wsHub, blockchainService, kitchenTicketService)
	tableService := service.NewTableService(tableRepo)
	categoryService := service.NewCategoryService(categoryRepo)
	ingredientService := service.NewIngredientService(ingredientRepo)
	accompanimentService := service.NewAccompanimentService(accompanimentRepo)
	stationService := service.NewStationService(stationRepo)
	printerService := service.NewPrinterService(printerRepo)
	backupService := service.NewBackupService(db)

	// Handlers
	userHandler := handler.NewUserHandler(userService)
	authHandler := handler.NewAuthHandler(authService)
	menuHandler := handler.NewMenuHandler(menuService)
	orderHandler := handler.NewOrderHandler(orderService)
	tableHandler := handler.NewTableHandler(tableService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	ingredientHandler := handler.NewIngredientHandler(ingredientService)
	accompanimentHandler := handler.NewAccompanimentHandler(accompanimentService)
	wsHandler := handler.NewWebSocketHandler(wsHub)
	stationHandler := handler.NewStationHandler(stationService)
	printerHandler := handler.NewPrinterHandler(printerService)
	kitchenTicketHandler := handler.NewKitchenTicketHandler(kitchenTicketService)
	backupHandler := handler.NewBackupHandler(backupService)

	app := fiber.New(fiber.Config{
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

	router.SetupRoutes(app, authHandler, userHandler, menuHandler, orderHandler, tableHandler, categoryHandler, ingredientHandler, accompanimentHandler, wsHandler, stationHandler, printerHandler, kitchenTicketHandler, backupHandler)

	// Alias explícitos para compatibilidad de rutas de impresión de cocina.
	app.Post("/api/orders/:orderId/kitchen-tickets/print/caja", middleware.Protected(), kitchenTicketHandler.PrintGlobalCashTicket)
	app.Post("/api/orders/:orderId/kitchen-tickets/retry", middleware.Protected(), kitchenTicketHandler.RetryKitchenTicketsPrint)
	app.Post("/api/orders/kitchen-tickets/retry-failed-recent", middleware.Protected(), kitchenTicketHandler.RetryRecentFailedKitchenTickets)

	// Alias explícitos para compatibilidad de rutas de backup.
	app.Get("/api/backups/catalog", middleware.Protected(), backupHandler.ExportCatalogBackup)
	app.Post("/api/backups/catalog/import", middleware.Protected(), backupHandler.ImportCatalogBackup)
	app.Post("/api/backup/catalog/import", middleware.Protected(), backupHandler.ImportCatalogBackup)
	app.Post("/api/backup/catalog", middleware.Protected(), backupHandler.ImportCatalogBackup)

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
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	log.Println("Migraciones de órdenes verificadas: parent_order_id/customer_name/print_status")
	return nil
}
