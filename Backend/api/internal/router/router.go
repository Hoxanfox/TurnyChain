// =================================================================
// ARCHIVO 1: /internal/router/router.go (FINAL)
// =================================================================
package router

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/middleware"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, authHandler *handler.AuthHandler, userHandler *handler.UserHandler, menuHandler *handler.MenuHandler, orderHandler *handler.OrderHandler, tableHandler *handler.TableHandler, categoryHandler *handler.CategoryHandler, ingredientHandler *handler.IngredientHandler, accompanimentHandler *handler.AccompanimentHandler, wsHandler *handler.WebSocketHandler) {
	// Ruta pública para WebSockets
	app.Get("/ws", websocket.New(wsHandler.HandleConnection))

	// Grupo principal de la API
	api := app.Group("/api")

	// Rutas públicas de autenticación
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

	// A partir de aquí, todas las rutas requieren un token JWT válido.
	protected := api.Group("/")
	protected.Use(middleware.Protected())

	// Rutas de Usuarios
	users := protected.Group("/users")
	users.Post("/", userHandler.CreateUser)
	users.Get("/", userHandler.GetUsers)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", userHandler.DeleteUser)

	// Rutas de Menú
	menu := protected.Group("/menu")
	menu.Get("/", menuHandler.GetMenuItems)
	menu.Post("/", menuHandler.CreateMenuItem)
	menu.Put("/:id", menuHandler.UpdateMenuItem)
	menu.Delete("/:id", menuHandler.DeleteMenuItem)
	menu.Post("/items/:id/increment-order-count", menuHandler.IncrementOrderCount)

	// Rutas de Órdenes
	orders := protected.Group("/orders")
	orders.Post("/", orderHandler.CreateOrder)
	orders.Post("/with-payment", orderHandler.CreateOrderWithPayment) // Nueva ruta para orden con pago
	orders.Get("/", orderHandler.GetOrders)
	orders.Get("/:id", orderHandler.GetOrderByID)
	orders.Put("/:id/status", orderHandler.UpdateOrderStatus)
	orders.Put("/:id/manage", orderHandler.ManageOrder)
	orders.Put("/:id/items", orderHandler.UpdateOrderItems)
	orders.Post("/:id/proof", orderHandler.UploadPaymentProof) // Nueva ruta para subir comprobante de pago

	// Rutas de Mesas
	tables := protected.Group("/tables")
	tables.Post("/", tableHandler.Create)
	tables.Get("/", tableHandler.GetAll)

	// Rutas de Categorías
	categories := protected.Group("/categories")
	categories.Post("/", categoryHandler.Create)
	categories.Get("/", categoryHandler.GetAll)
	categories.Put("/:id", categoryHandler.Update)
	categories.Delete("/:id", categoryHandler.Delete)

	// Rutas de Ingredientes
	ingredients := protected.Group("/ingredients")
	ingredients.Post("/", ingredientHandler.Create)
	ingredients.Get("/", ingredientHandler.GetAll)
	ingredients.Put("/:id", ingredientHandler.Update)
	ingredients.Delete("/:id", ingredientHandler.Delete)

	// Rutas de Acompañantes
	accompaniments := protected.Group("/accompaniments")
	accompaniments.Post("/", accompanimentHandler.Create)
	accompaniments.Get("/", accompanimentHandler.GetAll)
	accompaniments.Put("/:id", accompanimentHandler.Update)
	accompaniments.Delete("/:id", accompanimentHandler.Delete)
}
