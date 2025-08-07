// =================================================================
// ARCHIVO 7: /internal/router/router.go (ACTUALIZADO)
// =================================================================
package router

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/middleware"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, authHandler *handler.AuthHandler, userHandler *handler.UserHandler, menuHandler *handler.MenuHandler, orderHandler *handler.OrderHandler, tableHandler *handler.TableHandler, wsHandler *handler.WebSocketHandler) {
	app.Get("/ws", websocket.New(wsHandler.HandleConnection))
	
	api := app.Group("/api")
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

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
	orders.Put("/:id/manage", orderHandler.ManageOrder)
	orders.Put("/:id/items", orderHandler.UpdateOrderItems) // <-- Esta línea ahora es válida

	tables := protected.Group("/tables")
	tables.Post("/", tableHandler.Create)
	tables.Get("/", tableHandler.GetAll)
}