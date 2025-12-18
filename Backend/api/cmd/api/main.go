// =================================================================
// ARCHIVO 2: /cmd/api/main.go (FINAL)
// =================================================================
package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
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

	// Servicios
	userService := service.NewUserService(userRepo)
	authService := service.NewAuthService(userRepo)
	menuService := service.NewMenuService(menuRepo, wsHub)

	// MODIFICADO: Pasamos blockchainService, menuRepo, ingredientRepo y accompanimentRepo
	orderService := service.NewOrderService(orderRepo, tableRepo, menuRepo, ingredientRepo, accompanimentRepo, wsHub, blockchainService)
	tableService := service.NewTableService(tableRepo)
	categoryService := service.NewCategoryService(categoryRepo)
	ingredientService := service.NewIngredientService(ingredientRepo)
	accompanimentService := service.NewAccompanimentService(accompanimentRepo)

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

	app := fiber.New()
	app.Use(cors.New())

	// Servir archivos estáticos de uploads en /api/static (SIN autenticación)
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		log.Fatalf("No se pudo crear carpeta uploads: %v", err)
	}
	app.Static("/api/static", uploadsDir)

	router.SetupRoutes(app, authHandler, userHandler, menuHandler, orderHandler, tableHandler, categoryHandler, ingredientHandler, accompanimentHandler, wsHandler)

	log.Println("Iniciando servidor en el puerto 8080...")
	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("Error al iniciar el servidor: %v", err)
	}
}
