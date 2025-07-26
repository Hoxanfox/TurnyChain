// =================================================================
// ARCHIVO 9: /cmd/api/main.go (ACTUALIZADO)
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
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors" // <-- 1. IMPORTAMOS EL MIDDLEWARE DE CORS
	_ "github.com/lib/pq"
)

func main() {
	// Leer la configuración de la base de datos desde variables de entorno
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "user=postgres password=1234 dbname=restaurant_db host=localhost sslmode=disable" // Valor por defecto
	}
	
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error al conectar a la base de datos: %v", err)
	}
	defer db.Close()

	// --- Inyección de Dependencias ---
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	authService := service.NewAuthService(userRepo)

	userHandler := handler.NewUserHandler(userService)
	authHandler := handler.NewAuthHandler(authService)

	app := fiber.New()

	// --- 2. AÑADIMOS EL MIDDLEWARE DE CORS ---
	// Esto debe ir ANTES de la configuración de las rutas.
	// Permitirá peticiones desde cualquier origen (ideal para desarrollo).
	app.Use(cors.New())

	// Configuramos las rutas
	router.SetupRoutes(app, authHandler, userHandler)

	log.Println("Iniciando servidor en el puerto 8080...")
	if err := app.Listen(":8080"); err != nil {
		log.Fatalf("Error al iniciar el servidor: %v", err)
	}
}