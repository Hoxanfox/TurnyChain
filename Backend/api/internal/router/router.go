// =================================================================
// BACKEND: ARCHIVO 4: /internal/router/router.go (CORREGIDO)
// Propósito: Añadir la ruta para la conexión WebSocket.
// =================================================================
package router

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/middleware"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, authHandler *handler.AuthHandler, userHandler *handler.UserHandler, menuHandler *handler.MenuHandler, orderHandler *handler.OrderHandler, wsHandler *handler.WebSocketHandler) {
	// --- Ruta para WebSockets ---
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws", websocket.New(wsHandler.HandleConnection))

	// --- Rutas de la API ---
	api := app.Group("/api")

	// Ruta pública de login
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

	// A partir de aquí, todas las rutas requieren un token JWT válido.
	protected := api.Group("/")
	protected.Use(middleware.Protected())

	users := protected.Group("/users")
	users.Post("/", userHandler.CreateUser)
	users.Get("/", userHandler.GetUsers)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", userHandler.DeleteUser)

	menu := protected.Group("/menu")
	menu.Get("/", menuHandler.GetMenuItems)
	menu.Post("/", menuHandler.CreateMenuItem)
	menu.Put("/:id", menuHandler.UpdateMenuItem)
	menu.Delete("/:id", menuHandler.DeleteMenuItem)

	orders := protected.Group("/orders")
	orders.Post("/", orderHandler.CreateOrder)
	orders.Get("/", orderHandler.GetOrders)
	orders.Get("/:id", orderHandler.GetOrderByID)
	orders.Put("/:id/status", orderHandler.UpdateOrderStatus)
	orders.Put("/:id/manage", orderHandler.ManageOrder) // <-- NUEVA RUTA
}