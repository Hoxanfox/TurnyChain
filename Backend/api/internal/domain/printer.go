// =================================================================
// Printer Domain Model
// =================================================================
package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// PrintBlock representa un bloque o sub-bloque de configuración de impresión
type PrintBlock struct {
	ID         string       `json:"id"`
	Visible    bool         `json:"visible"`
	Align      string       `json:"align"`       // "left", "center", "right"
	FontSize   string       `json:"font_size"`   // "normal", "double"
	FontWeight string       `json:"font_weight"` // "normal", "bold"
	SubBlocks  []PrintBlock `json:"sub_blocks,omitempty"`
}

// PrintLayout is a list of blocks representing the print blocks in order
type PrintLayout []PrintBlock

func DefaultPrintLayout() PrintLayout {
	return PrintLayout{
		{ID: "header", Visible: true, Align: "center", FontSize: "double", FontWeight: "bold"},
		{ID: "order_info", Visible: true, Align: "center", FontSize: "normal", FontWeight: "bold"},
		{
			ID: "items", Visible: true, Align: "left", FontSize: "normal", FontWeight: "normal",
			SubBlocks: []PrintBlock{
				{ID: "item_name", Visible: true, Align: "left", FontSize: "normal", FontWeight: "bold"},
				{ID: "item_price", Visible: true, Align: "left", FontSize: "normal", FontWeight: "normal"},
				{ID: "item_modifiers", Visible: true, Align: "left", FontSize: "normal", FontWeight: "normal"},
				{ID: "item_notes", Visible: true, Align: "left", FontSize: "normal", FontWeight: "normal"},
			},
		},
		{ID: "totals", Visible: true, Align: "right", FontSize: "double", FontWeight: "bold"},
		{ID: "notes", Visible: true, Align: "left", FontSize: "normal", FontWeight: "normal"},
		{ID: "footer", Visible: true, Align: "left", FontSize: "normal", FontWeight: "normal"},
	}
}

func (p PrintLayout) Value() (driver.Value, error) {
	if len(p) == 0 {
		return json.Marshal(DefaultPrintLayout())
	}
	return json.Marshal(p)
}

func (p *PrintLayout) Scan(value interface{}) error {
	if value == nil {
		*p = DefaultPrintLayout()
		return nil
	}
	
	var b []byte
	switch v := value.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return errors.New("type assertion failed in Scan PrintLayout")
	}

	err := json.Unmarshal(b, &p)
	if err != nil {
		*p = DefaultPrintLayout()
	}
	
	if len(*p) == 0 {
		*p = DefaultPrintLayout()
	}
	return nil
}

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
	PrintLayout PrintLayout `json:"print_layout" db:"print_layout"`
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
	PrintLayout PrintLayout `json:"print_layout,omitempty"`
}

// UpdatePrinterRequest es el payload para actualizar una impresora
type UpdatePrinterRequest struct {
	Name        string       `json:"name"`
	IPAddress   string       `json:"ip_address"`
	Port        *int         `json:"port"`
	PrinterType *PrinterType `json:"printer_type"`
	StationID   *uuid.UUID   `json:"station_id"`
	PrintLayout *PrintLayout `json:"print_layout"`
	IsActive    *bool        `json:"is_active"`
}
