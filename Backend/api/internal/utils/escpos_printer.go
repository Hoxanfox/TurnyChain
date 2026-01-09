// =================================================================
// ESC/POS Printer Utility
// Maneja la comunicación con impresoras térmicas ESC/POS
// =================================================================
package utils

import (
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
)

// Comandos ESC/POS básicos
const (
	ESC = "\x1b"
	GS  = "\x1d"

	// Inicialización
	CMD_INIT = ESC + "@"

	// Alineación
	CMD_ALIGN_LEFT   = ESC + "a" + "\x00"
	CMD_ALIGN_CENTER = ESC + "a" + "\x01"
	CMD_ALIGN_RIGHT  = ESC + "a" + "\x02"

	// Formato de texto
	CMD_BOLD_ON       = ESC + "E" + "\x01"
	CMD_BOLD_OFF      = ESC + "E" + "\x00"
	CMD_DOUBLE_ON     = GS + "!" + "\x11" // Doble altura y ancho
	CMD_DOUBLE_OFF    = GS + "!" + "\x00"
	CMD_UNDERLINE_ON  = ESC + "-" + "\x01"
	CMD_UNDERLINE_OFF = ESC + "-" + "\x00"

	// Corte de papel
	CMD_CUT_FULL    = GS + "V" + "\x00"
	CMD_CUT_PARTIAL = GS + "V" + "\x01"

	// Feed
	CMD_LINE_FEED = "\n"
)

// ESCPOSPrinter maneja la conexión y comandos de impresora ESC/POS
type ESCPOSPrinter struct {
	host    string
	port    int
	timeout time.Duration
}

// NewESCPOSPrinter crea una nueva instancia del printer
func NewESCPOSPrinter(host string, port int) *ESCPOSPrinter {
	return &ESCPOSPrinter{
		host:    host,
		port:    port,
		timeout: 5 * time.Second,
	}
}

// PrintKitchenTicket imprime un ticket de cocina
func (p *ESCPOSPrinter) PrintKitchenTicket(ticket domain.KitchenTicket) error {
	// Construir el contenido del ticket
	content := p.buildTicketContent(ticket)

	// Enviar a la impresora
	return p.sendToNetwork(content)
}

// buildTicketContent construye el contenido ESC/POS del ticket
func (p *ESCPOSPrinter) buildTicketContent(ticket domain.KitchenTicket) string {
	var builder strings.Builder

	// Inicializar impresora
	builder.WriteString(CMD_INIT)

	// === ENCABEZADO ===
	builder.WriteString(CMD_ALIGN_CENTER)
	builder.WriteString(CMD_DOUBLE_ON)
	builder.WriteString(CMD_BOLD_ON)
	builder.WriteString(ticket.StationName)
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_DOUBLE_OFF)
	builder.WriteString(CMD_BOLD_OFF)
	builder.WriteString(CMD_LINE_FEED)

	// Información de la orden
	builder.WriteString(CMD_ALIGN_LEFT)
	builder.WriteString(CMD_BOLD_ON)
	builder.WriteString(fmt.Sprintf("ORDEN: %s", ticket.OrderNumber))
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_BOLD_OFF)

	builder.WriteString(fmt.Sprintf("Mesa: %d", ticket.TableNumber))
	builder.WriteString(CMD_LINE_FEED)

	builder.WriteString(fmt.Sprintf("Mesero: %s", ticket.WaiterName))
	builder.WriteString(CMD_LINE_FEED)

	builder.WriteString(fmt.Sprintf("Tipo: %s", ticket.OrderType))
	builder.WriteString(CMD_LINE_FEED)

	builder.WriteString(fmt.Sprintf("Hora: %s", ticket.CreatedAt.Format("15:04:05")))
	builder.WriteString(CMD_LINE_FEED)

	// Línea separadora
	builder.WriteString(p.line("-", 42))
	builder.WriteString(CMD_LINE_FEED)

	// === ITEMS ===
	builder.WriteString(CMD_BOLD_ON)
	builder.WriteString("ITEMS:")
	builder.WriteString(CMD_BOLD_OFF)
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_LINE_FEED)

	for _, item := range ticket.Items {
		// Cantidad y nombre del item
		builder.WriteString(CMD_BOLD_ON)
		builder.WriteString(CMD_DOUBLE_ON)
		builder.WriteString(fmt.Sprintf("%dx %s", item.Quantity, item.MenuItemName))
		builder.WriteString(CMD_DOUBLE_OFF)
		builder.WriteString(CMD_BOLD_OFF)
		builder.WriteString(CMD_LINE_FEED)

		// Para llevar
		if item.IsTakeout {
			builder.WriteString(CMD_BOLD_ON)
			builder.WriteString("   >>> PARA LLEVAR <<<")
			builder.WriteString(CMD_BOLD_OFF)
			builder.WriteString(CMD_LINE_FEED)
		}

		// Customizaciones
		if item.Customizations != nil {
			// Ingredientes activos (los que SÍ lleva el platillo)
			if len(item.Customizations.ActiveIngredients) > 0 {
				builder.WriteString("   CON: ")
				ingredients := make([]string, len(item.Customizations.ActiveIngredients))
				for i, ing := range item.Customizations.ActiveIngredients {
					ingredients[i] = ing.Name
				}
				builder.WriteString(strings.Join(ingredients, ", "))
				builder.WriteString(CMD_LINE_FEED)
			}

			// Acompañamientos seleccionados
			if len(item.Customizations.SelectedAccompaniments) > 0 {
				builder.WriteString("   ACOMP: ")
				accompaniments := make([]string, len(item.Customizations.SelectedAccompaniments))
				for i, acc := range item.Customizations.SelectedAccompaniments {
					accompaniments[i] = acc.Name
				}
				builder.WriteString(strings.Join(accompaniments, ", "))
				builder.WriteString(CMD_LINE_FEED)
			}
		}

		// Notas del item
		if item.Notes != "" {
			builder.WriteString(CMD_UNDERLINE_ON)
			builder.WriteString(fmt.Sprintf("   NOTA: %s", item.Notes))
			builder.WriteString(CMD_UNDERLINE_OFF)
			builder.WriteString(CMD_LINE_FEED)
		}

		builder.WriteString(CMD_LINE_FEED)
	}

	// Notas especiales de la orden
	if ticket.SpecialNotes != "" {
		builder.WriteString(p.line("-", 42))
		builder.WriteString(CMD_LINE_FEED)
		builder.WriteString(CMD_BOLD_ON)
		builder.WriteString("NOTA ESPECIAL:")
		builder.WriteString(CMD_BOLD_OFF)
		builder.WriteString(CMD_LINE_FEED)
		builder.WriteString(ticket.SpecialNotes)
		builder.WriteString(CMD_LINE_FEED)
	}

	// Línea final
	builder.WriteString(p.line("=", 42))
	builder.WriteString(CMD_LINE_FEED)

	// Espacios antes del corte
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_LINE_FEED)

	// Cortar papel
	builder.WriteString(CMD_CUT_PARTIAL)

	return builder.String()
}

// line genera una línea de caracteres repetidos
func (p *ESCPOSPrinter) line(char string, length int) string {
	return strings.Repeat(char, length)
}

// sendToNetwork envía los datos a la impresora vía TCP/IP
func (p *ESCPOSPrinter) sendToNetwork(data string) error {
	// Construir la dirección
	address := fmt.Sprintf("%s:%d", p.host, p.port)

	// Conectar a la impresora
	conn, err := net.DialTimeout("tcp", address, p.timeout)
	if err != nil {
		return fmt.Errorf("error al conectar con la impresora en %s: %w", address, err)
	}
	defer conn.Close()

	// Establecer timeout de escritura
	conn.SetWriteDeadline(time.Now().Add(p.timeout))

	// Enviar datos
	_, err = conn.Write([]byte(data))
	if err != nil {
		return fmt.Errorf("error al enviar datos a la impresora: %w", err)
	}

	return nil
}

// TestConnection prueba la conexión con la impresora enviando un ticket de prueba
func (p *ESCPOSPrinter) TestConnection() error {
	var builder strings.Builder

	builder.WriteString(CMD_INIT)
	builder.WriteString(CMD_ALIGN_CENTER)
	builder.WriteString(CMD_BOLD_ON)
	builder.WriteString("TEST DE CONEXION")
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_BOLD_OFF)
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(time.Now().Format("2006-01-02 15:04:05"))
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_CUT_PARTIAL)

	return p.sendToNetwork(builder.String())
}
