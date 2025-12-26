// =================================================================
// Printer Domain Model
// =================================================================
package domain

import (
	"time"

	"github.com/google/uuid"
)

// PrinterType define los tipos de impresoras soportadas
type PrinterType string

const (
	PrinterTypeESCPOS PrinterType = "escpos" // Impresoras térmicas ESC/POS (más común)
	PrinterTypePDF    PrinterType = "pdf"    // Generar PDF (para pruebas)
	PrinterTypeRaw    PrinterType = "raw"    // Envío directo de comandos raw
)

// Printer representa una impresora física asociada a una estación
type Printer struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	Name        string      `json:"name" db:"name"`
	IPAddress   string      `json:"ip_address" db:"ip_address"`
	Port        int         `json:"port" db:"port"`
	PrinterType PrinterType `json:"printer_type" db:"printer_type"`
	StationID   uuid.UUID   `json:"station_id" db:"station_id"`
	StationName string      `json:"station_name,omitempty" db:"station_name"` // Join con stations
	IsActive    bool        `json:"is_active" db:"is_active"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
}

// CreatePrinterRequest es el payload para crear una impresora
type CreatePrinterRequest struct {
	Name        string      `json:"name" binding:"required"`
	IPAddress   string      `json:"ip_address" binding:"required"`
	Port        int         `json:"port" binding:"required"`
	PrinterType PrinterType `json:"printer_type" binding:"required"`
	StationID   uuid.UUID   `json:"station_id" binding:"required"`
}

// UpdatePrinterRequest es el payload para actualizar una impresora
type UpdatePrinterRequest struct {
	Name        string       `json:"name"`
	IPAddress   string       `json:"ip_address"`
	Port        *int         `json:"port"`
	PrinterType *PrinterType `json:"printer_type"`
	StationID   *uuid.UUID   `json:"station_id"`
	IsActive    *bool        `json:"is_active"`
}
