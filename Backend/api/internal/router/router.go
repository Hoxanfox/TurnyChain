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

func SetupRoutes(app *fiber.App, authHandler *handler.AuthHandler, userHandler *handler.UserHandler, menuHandler *handler.MenuHandler, orderHandler *handler.OrderHandler, tableHandler *handler.TableHandler, categoryHandler *handler.CategoryHandler, ingredientHandler *handler.IngredientHandler, accompanimentHandler *handler.AccompanimentHandler, wsHandler *handler.WebSocketHandler, stationHandler *handler.StationHandler, printerHandler *handler.PrinterHandler, kitchenTicketHandler *handler.KitchenTicketHandler) {
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

	// Rutas de Estaciones
	stations := protected.Group("/stations")
	stations.Get("/", stationHandler.GetAll)
	stations.Get("/active", stationHandler.GetAllActive)
	stations.Get("/:id", stationHandler.GetByID)
	stations.Post("/", stationHandler.Create)
	stations.Put("/:id", stationHandler.Update)
	stations.Delete("/:id", stationHandler.Delete)
	// Impresoras de una estación
	stations.Get("/:stationId/printers", printerHandler.GetByStationID)

	// Rutas de Impresoras
	printers := protected.Group("/printers")
	printers.Get("/", printerHandler.GetAll)
	printers.Get("/active", printerHandler.GetAllActive)
	printers.Get("/:id", printerHandler.GetByID)
	printers.Post("/", printerHandler.Create)
	printers.Put("/:id", printerHandler.Update)
	printers.Delete("/:id", printerHandler.Delete)

	// Rutas de Tickets de Cocina (anidadas bajo orders)
	orders.Get("/:orderId/kitchen-tickets/preview", kitchenTicketHandler.GetTicketsPreview)
	orders.Post("/:orderId/kitchen-tickets/print", kitchenTicketHandler.PrintKitchenTickets)
}
