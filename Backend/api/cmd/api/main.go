// =================================================================
// ARCHIVO 2: /cmd/api/main.go (FINAL)
// =================================================================
package main

import (
	"database/sql"
	"log"
	"os"
	"strings"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/middleware"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/router"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
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

	kitchenTicketService := service.NewKitchenTicketService(orderRepo, printerRepo, stationRepo)
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

	app := fiber.New()
	app.Use(cors.New())

	// Servir archivos estáticos de uploads en /api/static (SIN autenticación)
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		log.Fatalf("No se pudo crear carpeta uploads: %v", err)
	}
	app.Static("/api/static", uploadsDir)

	router.SetupRoutes(app, authHandler, userHandler, menuHandler, orderHandler, tableHandler, categoryHandler, ingredientHandler, accompanimentHandler, wsHandler, stationHandler, printerHandler, kitchenTicketHandler, backupHandler)

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
		`CREATE INDEX IF NOT EXISTS orders_parent_order_id_idx ON orders (parent_order_id)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	log.Println("Migraciones de órdenes verificadas: parent_order_id/customer_name")
	return nil
}
