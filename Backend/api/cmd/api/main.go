// =================================================================
// ARCHIVO 3: /cmd/api/main.go (CORREGIDO)
// Propósito: Inyectar el hub de WebSockets en el servicio del menú.
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
	if err != nil { log.Fatalf("Error al conectar a la base de datos: %v", err) }
	defer db.Close()

	wsHub := wshub.NewHub()
	go wsHub.Run()

	// --- Inyección de Dependencias ---
	userRepo := repository.NewUserRepository(db)
	menuRepo := repository.NewMenuRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	tableRepo := repository.NewTableRepository(db)

	userService := service.NewUserService(userRepo)
	authService := service.NewAuthService(userRepo)
	menuService := service.NewMenuService(menuRepo, wsHub)
	// CORRECCIÓN: Se añade 'tableRepo' a la llamada.
	orderService := service.NewOrderService(orderRepo, tableRepo, wsHub)
	tableService := service.NewTableService(tableRepo)

	userHandler := handler.NewUserHandler(userService)
	authHandler := handler.NewAuthHandler(authService)
	menuHandler := handler.NewMenuHandler(menuService)
	orderHandler := handler.NewOrderHandler(orderService)
	tableHandler := handler.NewTableHandler(tableService)
	wsHandler := handler.NewWebSocketHandler(wsHub)

	app := fiber.New()
	app.Use(cors.New())

	router.SetupRoutes(app, authHandler, userHandler, menuHandler, orderHandler, tableHandler, wsHandler)

	log.Println("Iniciando servidor en el puerto 8080...")
	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("Error al iniciar el servidor: %v", err)
	}
}