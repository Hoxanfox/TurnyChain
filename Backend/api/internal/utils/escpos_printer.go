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
	"golang.org/x/text/encoding/charmap"
)

// Comandos ESC/POS básicos
const (
	ESC = "\x1b"
	GS  = "\x1d"

	// Inicialización y Codepage
	CMD_INIT          = ESC + "@"
	CMD_CODEPAGE_1252 = ESC + "t" + "\x10" // Latin 1 (Windows-1252)

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

	// Colores / Invertido
	CMD_INVERT_ON  = GS + "B" + "\x01"
	CMD_INVERT_OFF = GS + "B" + "\x00"

	// Corte de papel
	CMD_CUT_FULL    = GS + "V" + "\x00"
	CMD_CUT_PARTIAL = GS + "V" + "\x01"

	// Feed
	CMD_LINE_FEED = "\n"
)

// Helper para abreviar precios (ej: 15000 -> 15k)
func formatPriceShort(price int) string {
	if price >= 1000 {
		if price%1000 == 0 {
			return fmt.Sprintf("%dk", price/1000)
		}
		return fmt.Sprintf("%.1fk", float64(price)/1000)
	}
	return fmt.Sprintf("%d", price)
}

// Helper para convertir timestamp a hora de Colombia (UTC-5)
func toColombiaTime(t time.Time) time.Time {
	// Cargar la zona horaria de Colombia (America/Bogota)
	loc, err := time.LoadLocation("America/Bogota")
	if err != nil {
		// Si falla, usar UTC-5 manualmente
		loc = time.FixedZone("COT", -5*60*60) // Colombia Time (UTC-5)
	}
	return t.In(loc)
}

// ESCPOSPrinter maneja la conexión y comandos de impresora ESC/POS
type ESCPOSPrinter struct {
	host          string
	port          int
	timeout       time.Duration
	retryAttempts int
	retryDelay    time.Duration
}

// NewESCPOSPrinter crea una nueva instancia del printer
func NewESCPOSPrinter(host string, port int) *ESCPOSPrinter {
	return &ESCPOSPrinter{
		host:          host,
		port:          port,
		timeout:       10 * time.Second, // Timeout aumentado a 10 segundos
		retryAttempts: 3,                // 3 intentos de reintento
		retryDelay:    500 * time.Millisecond,
	}
}

// PrintKitchenTicket imprime un ticket de cocina
func (p *ESCPOSPrinter) PrintKitchenTicket(ticket domain.KitchenTicket, layout domain.PrintLayout) error {
	// Construir el contenido del ticket
	content := p.buildTicketContent(ticket, layout)

	// Enviar a la impresora
	return p.sendToNetwork(content)
}

func applyStyle(builder *strings.Builder, block domain.PrintBlock) {
	if block.Align == "center" {
		builder.WriteString(CMD_ALIGN_CENTER)
	} else if block.Align == "right" {
		builder.WriteString(CMD_ALIGN_RIGHT)
	} else {
		builder.WriteString(CMD_ALIGN_LEFT)
	}
	if block.FontSize == "double" {
		builder.WriteString(CMD_DOUBLE_ON)
	}
	if block.FontWeight == "bold" {
		builder.WriteString(CMD_BOLD_ON)
	}
}

func resetStyle(builder *strings.Builder, block domain.PrintBlock) {
	if block.FontWeight == "bold" {
		builder.WriteString(CMD_BOLD_OFF)
	}
	if block.FontSize == "double" {
		builder.WriteString(CMD_DOUBLE_OFF)
	}
	builder.WriteString(CMD_ALIGN_LEFT)
}

// buildTicketContent construye el contenido ESC/POS del ticket
func (p *ESCPOSPrinter) buildTicketContent(ticket domain.KitchenTicket, layout domain.PrintLayout) string {
	var builder strings.Builder

	// Inicializar impresora
	builder.WriteString(CMD_INIT)
	builder.WriteString(CMD_CODEPAGE_1252)

	if len(layout) == 0 {
		layout = domain.DefaultPrintLayout()
	}

	for _, block := range layout {
		if !block.Visible {
			continue
		}
		
		switch block.ID {
		case "header":
			applyStyle(&builder, block)
			builder.WriteString(ticket.StationName)
			resetStyle(&builder, block)
			builder.WriteString(CMD_LINE_FEED)

		case "order_info":
			applyStyle(&builder, block)
			builder.WriteString(fmt.Sprintf("ORDEN: %s", ticket.OrderNumber))
			builder.WriteString(CMD_LINE_FEED)
			var tipoOrden string
			if ticket.TableNumber == 9999 {
				tipoOrden = "LLEVAR"
			} else if ticket.TableNumber == 9998 {
				tipoOrden = "DOMICILIO"
			} else {
				tipoOrden = strings.ToUpper(ticket.OrderType)
			}
			builder.WriteString(tipoOrden)
			builder.WriteString(CMD_LINE_FEED)

			colombiaTime := toColombiaTime(ticket.CreatedAt)
			builder.WriteString(fmt.Sprintf("Fecha: %s", colombiaTime.Format("02/01/2006 15:04:05")))
			resetStyle(&builder, block)
			builder.WriteString(CMD_LINE_FEED)
			builder.WriteString(p.line("-", 42))
			builder.WriteString(CMD_LINE_FEED)

		case "items":
			applyStyle(&builder, block)
			builder.WriteString("ITEMS:")
			resetStyle(&builder, block)
			builder.WriteString(CMD_LINE_FEED)

			var nameBlock, priceBlock, modsBlock, notesBlock *domain.PrintBlock
			for i := range block.SubBlocks {
				sb := &block.SubBlocks[i]
				switch sb.ID {
				case "item_name":
					nameBlock = sb
				case "item_price":
					priceBlock = sb
				case "item_modifiers":
					modsBlock = sb
				case "item_notes":
					notesBlock = sb
				}
			}

			for _, item := range ticket.Items {
				builder.WriteString(p.line("-", 42))
				builder.WriteString(CMD_LINE_FEED)

				if nameBlock == nil || nameBlock.Visible {
					nb := domain.PrintBlock{Align: "left", FontSize: "double", FontWeight: "bold"}
					if nameBlock != nil {
						nb = *nameBlock
					}
					applyStyle(&builder, nb)
					builder.WriteString(fmt.Sprintf("%dx %s", item.Quantity, item.MenuItemName))
					resetStyle(&builder, nb)
					builder.WriteString(CMD_LINE_FEED)
				}

				if priceBlock == nil || priceBlock.Visible {
					pb := domain.PrintBlock{Align: "left", FontSize: "normal", FontWeight: "normal"}
					if priceBlock != nil {
						pb = *priceBlock
					}
					unitPrice := formatPriceShort(item.Price)
					subtotal := formatPriceShort(item.Price * item.Quantity)
					applyStyle(&builder, pb)
					builder.WriteString(fmt.Sprintf("   $%s c/u -> $%s", unitPrice, subtotal))
					resetStyle(&builder, pb)
					builder.WriteString(CMD_LINE_FEED)
				}

				hasMods := item.Notes != "" || (item.Customizations != nil && (len(item.Customizations.ActiveIngredients) > 0 || len(item.Customizations.SelectedAccompaniments) > 0))
				if hasMods {
					builder.WriteString(CMD_LINE_FEED)
					builder.WriteString(CMD_ALIGN_CENTER)
					builder.WriteString(CMD_INVERT_ON)
					builder.WriteString(CMD_BOLD_ON)
					builder.WriteString(CMD_DOUBLE_ON)
					builder.WriteString(" >>> MODIFICADO <<< ")
					builder.WriteString(CMD_DOUBLE_OFF)
					builder.WriteString(CMD_BOLD_OFF)
					builder.WriteString(CMD_INVERT_OFF)
					builder.WriteString(CMD_ALIGN_LEFT)
					builder.WriteString(CMD_LINE_FEED)
					builder.WriteString(CMD_LINE_FEED)
				}

				if item.IsTakeout {
					builder.WriteString(CMD_LINE_FEED)
					builder.WriteString(CMD_ALIGN_CENTER)
					builder.WriteString(CMD_INVERT_ON)
					builder.WriteString(CMD_BOLD_ON)
					builder.WriteString(CMD_DOUBLE_ON)
					builder.WriteString(" >>> PARA LLEVAR <<< ")
					builder.WriteString(CMD_DOUBLE_OFF)
					builder.WriteString(CMD_BOLD_OFF)
					builder.WriteString(CMD_INVERT_OFF)
					builder.WriteString(CMD_ALIGN_LEFT)
					builder.WriteString(CMD_LINE_FEED)
					builder.WriteString(CMD_LINE_FEED)
				}

				if modsBlock == nil || modsBlock.Visible {
					mb := domain.PrintBlock{Align: "left", FontSize: "normal", FontWeight: "normal"}
					if modsBlock != nil {
						mb = *modsBlock
					}
					if item.Customizations != nil {
						if len(item.Customizations.ActiveIngredients) > 0 {
							applyStyle(&builder, mb)
							builder.WriteString("   CON: ")
							ings := []string{}
							for _, ing := range item.Customizations.ActiveIngredients {
								ings = append(ings, ing.Name)
							}
							builder.WriteString(strings.Join(ings, ", "))
							resetStyle(&builder, mb)
							builder.WriteString(CMD_LINE_FEED)
						}
						if len(item.Customizations.SelectedAccompaniments) > 0 {
							applyStyle(&builder, mb)
							builder.WriteString("   ACOMP: ")
							accs := []string{}
							for _, acc := range item.Customizations.SelectedAccompaniments {
								accs = append(accs, acc.Name)
							}
							builder.WriteString(strings.Join(accs, ", "))
							resetStyle(&builder, mb)
							builder.WriteString(CMD_LINE_FEED)
						}
					}
				}

				if notesBlock == nil || notesBlock.Visible {
					nb := domain.PrintBlock{Align: "left", FontSize: "normal", FontWeight: "normal"}
					if notesBlock != nil {
						nb = *notesBlock
					}
					if item.Notes != "" {
						applyStyle(&builder, nb)
						builder.WriteString(CMD_UNDERLINE_ON + "   NOTA: " + item.Notes + CMD_UNDERLINE_OFF)
						resetStyle(&builder, nb)
						builder.WriteString(CMD_LINE_FEED)
					}
				}

				builder.WriteString(p.line("-", 42))
				builder.WriteString(CMD_LINE_FEED)
				builder.WriteString(CMD_LINE_FEED)
			}

		case "totals":
			if strings.Contains(strings.ToUpper(ticket.StationName), "CAJA") {
				totalTicket := 0
				for _, item := range ticket.Items {
					totalTicket += (item.Price * item.Quantity)
				}

				builder.WriteString(p.line("=", 42) + CMD_LINE_FEED)
				applyStyle(&builder, block)
				builder.WriteString(fmt.Sprintf("TOTAL ORDEN: $%s", formatPriceShort(totalTicket)))
				resetStyle(&builder, block)
				builder.WriteString(CMD_LINE_FEED)
			}

		case "notes":
			if ticket.SpecialNotes != "" {
				builder.WriteString(p.line("-", 42) + CMD_LINE_FEED)
				applyStyle(&builder, block)
				builder.WriteString("NOTA ESPECIAL:" + CMD_LINE_FEED)
				builder.WriteString(ticket.SpecialNotes)
				resetStyle(&builder, block)
				builder.WriteString(CMD_LINE_FEED)
			}

		case "footer":
			builder.WriteString(p.line("=", 42) + CMD_LINE_FEED)
			applyStyle(&builder, block)
			mesaLabel := ""
			switch ticket.TableNumber {
			case 9999:
				mesaLabel = "LLEVAR"
			case 9998:
				mesaLabel = "DOMICILIO"
			default:
				mesaLabel = fmt.Sprintf("Mesa: %d", ticket.TableNumber)
			}
			builder.WriteString(fmt.Sprintf("Mesero: %s\n%s", ticket.WaiterName, mesaLabel))
			resetStyle(&builder, block)
			builder.WriteString(CMD_LINE_FEED)
			builder.WriteString(p.line("-", 42) + CMD_LINE_FEED)
			builder.WriteString(CMD_LINE_FEED + CMD_LINE_FEED + CMD_LINE_FEED)
		}
	}

	builder.WriteString(CMD_CUT_PARTIAL)

	return builder.String()
}

// line genera una línea de caracteres repetidos
func (p *ESCPOSPrinter) line(char string, length int) string {
	return strings.Repeat(char, length)
}

// sendToNetwork envía los datos a la impresora vía TCP/IP con reintentos
func (p *ESCPOSPrinter) sendToNetwork(data string) error {
	// Intentamos codificar el texto a Windows-1252 para soportar tildes y eñes
	encodedData, err := charmap.Windows1252.NewEncoder().String(data)
	if err == nil {
		data = encodedData
	}

	address := fmt.Sprintf("%s:%d", p.host, p.port)
	var lastErr error

	// Intentar múltiples veces en caso de que la impresora esté ocupada
	for attempt := 1; attempt <= p.retryAttempts; attempt++ {
		if attempt > 1 {
			// Esperar antes de reintentar
			time.Sleep(p.retryDelay)
			fmt.Printf("⚠️  Reintentando conexión a %s (intento %d/%d)...\n", address, attempt, p.retryAttempts)
		}

		// Conectar a la impresora
		conn, err := net.DialTimeout("tcp", address, p.timeout)
		if err != nil {
			lastErr = err
			continue // Intentar de nuevo
		}

		// Establecer timeout de escritura
		conn.SetWriteDeadline(time.Now().Add(p.timeout))
		conn.SetReadDeadline(time.Now().Add(p.timeout))

		// Enviar datos
		_, err = conn.Write([]byte(data))
		conn.Close() // Cerrar inmediatamente después de enviar

		if err != nil {
			lastErr = err
			continue // Intentar de nuevo
		}

		// Éxito
		return nil
	}

	// Si llegamos aquí, todos los intentos fallaron
	return fmt.Errorf("error al conectar con la impresora en %s después de %d intentos: %w",
		address, p.retryAttempts, lastErr)
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
