// =================================================================
// ARCHIVO 1: /internal/router/router.go (FINAL)
// =================================================================
package router

import (
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/handler"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/middleware"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, authHandler *handler.AuthHandler, userHandler *handler.UserHandler, menuHandler *handler.MenuHandler, orderHandler *handler.OrderHandler, invoiceHandler *handler.InvoiceHandler, tableHandler *handler.TableHandler, categoryHandler *handler.CategoryHandler, ingredientHandler *handler.IngredientHandler, accompanimentHandler *handler.AccompanimentHandler, wsHandler *handler.WebSocketHandler, stationHandler *handler.StationHandler, printerHandler *handler.PrinterHandler, kitchenTicketHandler *handler.KitchenTicketHandler, backupHandler *handler.BackupHandler, cashRegisterHandler *handler.CashRegisterHandler, settingHandler *handler.SettingHandler, sessionRepo repository.SessionRepository) {
	// Ruta pública para WebSockets
	app.Get("/ws", websocket.New(wsHandler.HandleConnection))

	// Grupo principal de la API
	api := app.Group("/api")

	// Rutas públicas de autenticación y settings
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

	settingsPub := api.Group("/settings")
	settingsPub.Get("/", settingHandler.GetAllSettings)
	settingsPub.Get("/:key", settingHandler.GetSetting)

	// A partir de aquí, todas las rutas requieren un token JWT válido.
	protected := api.Group("/")
	protected.Use(middleware.Protected(sessionRepo))

	// Rutas de autenticación protegidas
	authProtected := protected.Group("/auth")
	authProtected.Post("/verify-password", authHandler.VerifyPassword)

	// Rutas de Settings protegidas
	settingsProtected := protected.Group("/settings")
	settingsProtected.Post("/", settingHandler.UpsertSetting)
	settingsProtected.Post("/upload-image", settingHandler.UploadSettingImage)

	// Rutas de Usuarios
	users := protected.Group("/users")
	users.Post("/", userHandler.CreateUser)
	users.Get("/", userHandler.GetUsers)
	users.Put("/:id", userHandler.UpdateUser)
	users.Put("/:id/password", userHandler.UpdateUserPassword)
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
	orders.Get("/today", orderHandler.GetOrdersToday)
	orders.Get("/waiter-approved-stats", orderHandler.GetWaiterApprovedStats) // Nueva ruta para estadísticas de meseros
	orders.Get("/:id", orderHandler.GetOrderByID)
	orders.Put("/:id/status", orderHandler.UpdateOrderStatus)
	orders.Put("/:id/manage", orderHandler.ManageOrder)
	orders.Put("/:id/items", orderHandler.UpdateOrderItems)
	orders.Patch("/:id/edit", orderHandler.EditOrder) // Nueva ruta para edición granular de orden
	orders.Post("/:id/link", orderHandler.LinkOrder) // Nueva ruta para vincular órdenes
	orders.Post("/:id/proof", orderHandler.UploadPaymentProof) // Ruta existente para 1 solo pago
	orders.Post("/:id/split-payments", orderHandler.UploadSplitPayments) // Nueva ruta para multiples pagos

	// Rutas de Facturas
	invoices := protected.Group("/invoices")
	invoices.Get("/history", invoiceHandler.GetInvoiceHistory)

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
	printers.Post("/:id/test", printerHandler.TestConnection) // Nueva ruta para probar conexión

	// Rutas de Tickets de Cocina (anidadas bajo orders)
	orders.Get("/:orderId/kitchen-tickets/preview", kitchenTicketHandler.GetTicketsPreview)
	orders.Get("/:orderId/kitchen-tickets/preview/station/:stationId", kitchenTicketHandler.GetTicketsPreviewByStation)
	orders.Post("/:orderId/kitchen-tickets/print", kitchenTicketHandler.PrintKitchenTickets)
	orders.Post("/:orderId/kitchen-tickets/print/station/:stationId", kitchenTicketHandler.PrintKitchenTicketsByStation)

	// Rutas de Backup (sin incluir órdenes)
	backup := protected.Group("/backup")
	backup.Get("/catalog", backupHandler.ExportCatalogBackup)

	// Rutas de Control de Caja
	cashRegister := protected.Group("/cash-register")
	cashRegister.Post("/open", cashRegisterHandler.OpenSession)
	cashRegister.Get("/current", cashRegisterHandler.GetCurrentSession)
	cashRegister.Get("/closing-details", cashRegisterHandler.GetClosingDetails)
	cashRegister.Post("/expenses", cashRegisterHandler.AddExpense)
	cashRegister.Post("/close", cashRegisterHandler.CloseSession)
}
