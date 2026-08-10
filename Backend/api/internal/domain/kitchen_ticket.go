// =================================================================
// Kitchen Ticket Domain Model
// =================================================================
package domain

import (
	"time"

	"github.com/google/uuid"
)

// KitchenTicket representa un ticket cortado que se envía a una estación específica
type KitchenTicket struct {
	OrderID      uuid.UUID           `json:"order_id"`
	OrderNumber  string              `json:"order_number"` // Ej: "ORD-001"
	TableNumber  int                 `json:"table_number"`
	WaiterName   string              `json:"waiter_name"`
	StationID    uuid.UUID           `json:"station_id"`
	StationName  string              `json:"station_name"`
	Items        []KitchenTicketItem `json:"items"`
	CreatedAt    time.Time           `json:"created_at"`
	OrderType    string              `json:"order_type"` // "mesa", "llevar", "domicilio"
	SpecialNotes string              `json:"special_notes,omitempty"`
	RawContent   string              `json:"raw_content,omitempty"`  // Contenido ESC/POS raw (para USB)
	PrinterType  PrinterType         `json:"printer_type,omitempty"` // Para que el frontend sepa cómo imprimir
}

// KitchenTicketItem representa un item dentro del ticket de cocina
type KitchenTicketItem struct {
	MenuItemName   string          `json:"menu_item_name"`
	Quantity       int             `json:"quantity"`
	Notes          string          `json:"notes,omitempty"`
	Customizations *Customizations `json:"customizations,omitempty"`
	IsTakeout      bool            `json:"is_takeout"`
	Price          int             `json:"price"` // Precio unitario en moneda local
	IsModified     bool            `json:"is_modified"`
}

// StationSummary es el resumen de una estación dentro de una orden
type StationSummary struct {
	StationID     uuid.UUID `json:"station_id"`
	StationName   string    `json:"station_name"`
	UniqueItems   int       `json:"unique_items"`   // Tipos de platillos distintos
	TotalQuantity int       `json:"total_quantity"` // Suma de cantidades en esa estación
}

// StationTicketsResponse agrupa todos los tickets por estación para una orden
type StationTicketsResponse struct {
	OrderID       uuid.UUID        `json:"order_id"`
	OrderNumber   string           `json:"order_number"`
	TableNumber   int              `json:"table_number"`
	WaiterName    string           `json:"waiter_name"`
	OrderType     string           `json:"order_type"`
	TotalStations int              `json:"total_stations"`
	TotalItems    int              `json:"total_items"` // Suma total de cantidades
	Summary       []StationSummary `json:"summary"`
	Tickets       []KitchenTicket  `json:"tickets"`
}

// PrintRequest es el payload para solicitar impresión de tickets
type PrintRequest struct {
	OrderID uuid.UUID `json:"order_id" binding:"required"`
	Reprint bool      `json:"reprint"` // true = reimprimir tickets
}

// PrintResponse es la respuesta después de imprimir
type PrintResponse struct {
	Success      bool              `json:"success"`
	Message      string            `json:"message"`
	TicketsSent  int               `json:"tickets_sent"`
	FailedPrints []FailedPrintInfo `json:"failed_prints,omitempty"`
	Tickets      []KitchenTicket   `json:"tickets"` // Para debugging
}

// FailedPrintInfo contiene info de impresiones fallidas
type FailedPrintInfo struct {
	StationName string `json:"station_name"`
	PrinterName string `json:"printer_name"`
	Error       string `json:"error"`
}
