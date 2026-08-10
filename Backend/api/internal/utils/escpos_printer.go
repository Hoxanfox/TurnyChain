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
func (p *ESCPOSPrinter) PrintKitchenTicket(ticket domain.KitchenTicket) error {
	// Construir el contenido del ticket
	content := p.BuildTicketContent(ticket)

	// Enviar a la impresora
	return p.sendToNetwork(content)
}

// BuildTicketContent construye el contenido ESC/POS del ticket
func (p *ESCPOSPrinter) BuildTicketContent(ticket domain.KitchenTicket) string {
	var builder strings.Builder

	// Inicializar impresora
	builder.WriteString(CMD_INIT)
	builder.WriteString(CMD_CODEPAGE_1252)

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
	builder.WriteString(CMD_ALIGN_CENTER)
	builder.WriteString(CMD_BOLD_ON)
	builder.WriteString(fmt.Sprintf("ORDEN: %s", ticket.OrderNumber))
	builder.WriteString(CMD_LINE_FEED)
	builder.WriteString(CMD_BOLD_OFF)

	// Tipo de orden resaltado
	builder.WriteString(CMD_ALIGN_CENTER)
	builder.WriteString(CMD_DOUBLE_ON)
	builder.WriteString(CMD_BOLD_ON)
	var tipoOrden string
	if ticket.TableNumber == 9999 {
		tipoOrden = "LLEVAR"
	} else if ticket.TableNumber == 9998 {
		tipoOrden = "DOMICILIO"
	} else {
		tipoOrden = strings.ToUpper(ticket.OrderType)
	}
	builder.WriteString(tipoOrden)
	builder.WriteString(CMD_BOLD_OFF)
	builder.WriteString(CMD_DOUBLE_OFF)
	builder.WriteString(CMD_LINE_FEED)

	builder.WriteString(CMD_ALIGN_CENTER)
	// Convertir la hora a zona horaria de Colombia antes de formatear
	colombiaTime := toColombiaTime(ticket.CreatedAt)
	builder.WriteString(fmt.Sprintf("Fecha: %s", colombiaTime.Format("02/01/2006 15:04:05")))
	builder.WriteString(CMD_LINE_FEED)

	builder.WriteString(p.line("-", 42))
	builder.WriteString(CMD_LINE_FEED)

	// === ITEMS ===
	builder.WriteString(CMD_BOLD_ON)
	builder.WriteString("ITEMS:")
	builder.WriteString(CMD_BOLD_OFF)
	builder.WriteString(CMD_LINE_FEED)

	isCaja := strings.Contains(strings.ToUpper(ticket.StationName), "CAJA")

	for _, item := range ticket.Items {
		builder.WriteString(CMD_ALIGN_LEFT)
		builder.WriteString(CMD_BOLD_ON)

		// 2. Cantidad y Nombre del Item
		builder.WriteString(fmt.Sprintf("%dx %s", item.Quantity, item.MenuItemName))
		builder.WriteString(CMD_LINE_FEED)

		// 3. Precios (solo si es caja)
		if isCaja {
			unitPrice := formatPriceShort(item.Price)
			subtotal := formatPriceShort(item.Price * item.Quantity)
			builder.WriteString(fmt.Sprintf("$%s c/u -> $%s", unitPrice, subtotal))
			builder.WriteString(CMD_LINE_FEED)
		}

		builder.WriteString(CMD_BOLD_OFF)

		// 4. Customizaciones y Notas
		if item.IsModified {
			builder.WriteString(CMD_INVERT_ON)
			builder.WriteString(CMD_BOLD_ON)
			builder.WriteString(" * #### MODIFICADO #### * ")
			builder.WriteString(CMD_BOLD_OFF)
			builder.WriteString(CMD_INVERT_OFF)
			builder.WriteString(CMD_LINE_FEED)
		}

		if item.Customizations != nil {
			if len(item.Customizations.ActiveIngredients) > 0 {
				builder.WriteString("CON: ")
				ings := []string{}
				for _, ing := range item.Customizations.ActiveIngredients {
					ings = append(ings, ing.Name)
				}
				builder.WriteString(strings.Join(ings, ", ") + CMD_LINE_FEED)
			}
			if len(item.Customizations.SelectedAccompaniments) > 0 {
				builder.WriteString("ACOMP: ")
				accs := []string{}
				for _, acc := range item.Customizations.SelectedAccompaniments {
					accs = append(accs, acc.Name)
				}
				builder.WriteString(strings.Join(accs, ", ") + CMD_LINE_FEED)
			}
		}

		if isCaja && item.IsTakeout {
			builder.WriteString(CMD_INVERT_ON)
			builder.WriteString(CMD_BOLD_ON)
			builder.WriteString(" >>> PARA LLEVAR <<< ")
			builder.WriteString(CMD_BOLD_OFF)
			builder.WriteString(CMD_INVERT_OFF)
			builder.WriteString(CMD_LINE_FEED)
		}

		if item.Notes != "" {
			builder.WriteString(CMD_UNDERLINE_ON + "NOTA: " + item.Notes + CMD_UNDERLINE_OFF + CMD_LINE_FEED)
		}
	}

	builder.WriteString(CMD_ALIGN_LEFT)

	// === TOTAL PARA CAJA ===
	// Si la estación contiene "CAJA", calculamos el total de los items presentes en este ticket
	if strings.Contains(strings.ToUpper(ticket.StationName), "CAJA") {
		totalTicket := 0
		for _, item := range ticket.Items {
			totalTicket += (item.Price * item.Quantity)
		}

		builder.WriteString(p.line("=", 42) + CMD_LINE_FEED)
		builder.WriteString(CMD_ALIGN_RIGHT)
		builder.WriteString(CMD_DOUBLE_ON + CMD_BOLD_ON)
		builder.WriteString(fmt.Sprintf("TOTAL ORDEN: $%s", formatPriceShort(totalTicket))) // Formato abreviado con "k"
		builder.WriteString(CMD_BOLD_OFF + CMD_DOUBLE_OFF + CMD_LINE_FEED)
		builder.WriteString(CMD_ALIGN_LEFT)
	}

	// Notas especiales de la orden
	if ticket.SpecialNotes != "" {
		builder.WriteString(p.line("-", 42) + CMD_LINE_FEED)
		builder.WriteString(CMD_BOLD_ON + "NOTA ESPECIAL:" + CMD_BOLD_OFF + CMD_LINE_FEED)
		builder.WriteString(ticket.SpecialNotes + CMD_LINE_FEED)
	}

	builder.WriteString(p.line("=", 42) + CMD_LINE_FEED)

	// Pie de ticket: Mesero y Mesa
	builder.WriteString(CMD_ALIGN_LEFT)
	builder.WriteString(CMD_DOUBLE_ON)
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
	builder.WriteString(CMD_DOUBLE_OFF + CMD_LINE_FEED)

	builder.WriteString(p.line("-", 42) + CMD_LINE_FEED)
	builder.WriteString(CMD_LINE_FEED + CMD_LINE_FEED)
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
