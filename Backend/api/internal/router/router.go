// =================================================================
// ARCHIVO 4: /internal/router/router.go (ACTUALIZADO)
// =================================================================
package router

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, authHandler *handler.AuthHandler, userHandler *handler.UserHandler) {
	api := app.Group("/api")

	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

	users := api.Group("/users")
	users.Use(middleware.Protected())
	users.Post("/", userHandler.CreateUser)
	users.Get("/", userHandler.GetUsers)
	users.Put("/:id", userHandler.UpdateUser)       // <-- NUEVO
	users.Delete("/:id", userHandler.DeleteUser) // <-- NUEVO
}