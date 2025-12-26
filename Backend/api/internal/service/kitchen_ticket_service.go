// =================================================================
// Kitchen Ticket Service
// Gestiona la generación y envío de tickets cortados por estación
// =================================================================
package service

import (
	"backend/internal/domain"
	"backend/internal/repository"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

type KitchenTicketService struct {
	orderRepo   *repository.OrderRepository
	printerRepo *repository.PrinterRepository
	stationRepo *repository.StationRepository
}

func NewKitchenTicketService(
	orderRepo *repository.OrderRepository,
	printerRepo *repository.PrinterRepository,
	stationRepo *repository.StationRepository,
) *KitchenTicketService {
	return &KitchenTicketService{
		orderRepo:   orderRepo,
		printerRepo: printerRepo,
		stationRepo: stationRepo,
	}
}

// GenerateKitchenTickets genera los tickets cortados para una orden
// Agrupa los items por estación según su categoría
func (s *KitchenTicketService) GenerateKitchenTickets(orderID uuid.UUID) ([]domain.KitchenTicket, error) {
	// 1. Obtener la orden completa con todos sus items
	order, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, fmt.Errorf("error al obtener orden: %w", err)
	}

	if order == nil {
		return nil, fmt.Errorf("orden no encontrada")
	}

	// 2. Agrupar items por estación
	stationItems := make(map[uuid.UUID][]domain.KitchenTicketItem)
	stationInfo := make(map[uuid.UUID]struct {
		ID   uuid.UUID
		Name string
	})

	for _, item := range order.Items {
		// Si el item tiene category con station_id, usar esa estación
		if item.CategoryStationID != nil {
			stationID := *item.CategoryStationID

			// Agregar info de la estación si no existe
			if _, exists := stationInfo[stationID]; !exists {
				stationInfo[stationID] = struct {
					ID   uuid.UUID
					Name string
				}{
					ID:   stationID,
					Name: item.CategoryStationName,
				}
			}

			// Agregar el item a la estación
			stationItems[stationID] = append(stationItems[stationID], domain.KitchenTicketItem{
				MenuItemName:   item.MenuItemName,
				Quantity:       item.Quantity,
				Notes:          item.Notes,
				Customizations: item.Customizations,
				IsTakeout:      item.IsTakeout,
			})
		}
	}

	// 3. Generar tickets por estación
	var tickets []domain.KitchenTicket
	orderNumber := fmt.Sprintf("ORD-%s", orderID.String()[:8])

	for stationID, items := range stationItems {
		info := stationInfo[stationID]

		ticket := domain.KitchenTicket{
			OrderID:      order.ID,
			OrderNumber:  orderNumber,
			TableNumber:  order.TableNumber,
			WaiterName:   order.WaiterName,
			StationID:    stationID,
			StationName:  info.Name,
			Items:        items,
			CreatedAt:    order.CreatedAt,
			OrderType:    order.OrderType,
			SpecialNotes: "", // Se puede agregar después si es necesario
		}

		tickets = append(tickets, ticket)
	}

	return tickets, nil
}

// PrintKitchenTickets genera los tickets y los envía a las impresoras correspondientes
func (s *KitchenTicketService) PrintKitchenTickets(orderID uuid.UUID, reprint bool) (*domain.PrintResponse, error) {
	// 1. Generar los tickets
	tickets, err := s.GenerateKitchenTickets(orderID)
	if err != nil {
		return nil, err
	}

	if len(tickets) == 0 {
		return &domain.PrintResponse{
			Success:     true,
			Message:     "No hay items para imprimir (sin estaciones asignadas)",
			TicketsSent: 0,
			Tickets:     tickets,
		}, nil
	}

	// 2. Obtener las estaciones involucradas
	stationIDs := make([]uuid.UUID, 0, len(tickets))
	for _, ticket := range tickets {
		stationIDs = append(stationIDs, ticket.StationID)
	}

	// 3. Obtener las impresoras de esas estaciones
	printers, err := s.printerRepo.GetByStationIDs(stationIDs)
	if err != nil {
		return nil, fmt.Errorf("error al obtener impresoras: %w", err)
	}

	// Mapear impresoras por estación
	printersByStation := make(map[uuid.UUID][]domain.Printer)
	for _, printer := range printers {
		printersByStation[printer.StationID] = append(printersByStation[printer.StationID], printer)
	}

	// 4. Enviar tickets a cada impresora
	var failedPrints []domain.FailedPrintInfo
	successCount := 0

	for _, ticket := range tickets {
		printers, exists := printersByStation[ticket.StationID]
		if !exists || len(printers) == 0 {
			failedPrints = append(failedPrints, domain.FailedPrintInfo{
				StationName: ticket.StationName,
				PrinterName: "N/A",
				Error:       "No hay impresoras configuradas para esta estación",
			})
			continue
		}

		// Enviar a la primera impresora activa de la estación
		// En el futuro se puede implementar load balancing o backup printers
		printer := printers[0]

		err := s.sendToPrinter(printer, ticket)
		if err != nil {
			failedPrints = append(failedPrints, domain.FailedPrintInfo{
				StationName: ticket.StationName,
				PrinterName: printer.Name,
				Error:       err.Error(),
			})
			log.Printf("❌ Error al imprimir en %s (%s): %v", printer.Name, ticket.StationName, err)
		} else {
			successCount++
			log.Printf("✅ Ticket enviado a %s (%s)", printer.Name, ticket.StationName)
		}
	}

	// 5. Preparar respuesta
	response := &domain.PrintResponse{
		Success:      len(failedPrints) == 0,
		TicketsSent:  successCount,
		FailedPrints: failedPrints,
		Tickets:      tickets,
	}

	if response.Success {
		response.Message = fmt.Sprintf("Tickets impresos correctamente en %d estaciones", successCount)
	} else {
		response.Message = fmt.Sprintf("Impresión completada con errores: %d exitosos, %d fallidos", successCount, len(failedPrints))
	}

	return response, nil
}

// sendToPrinter envía el ticket a una impresora específica
// TODO: Implementar la lógica real de impresión ESC/POS
func (s *KitchenTicketService) sendToPrinter(printer domain.Printer, ticket domain.KitchenTicket) error {
	// Por ahora solo simulamos el envío
	// En producción, aquí se implementaría:
	// 1. Generar comandos ESC/POS
	// 2. Conectar al socket de la impresora (printer.IPAddress:printer.Port)
	// 3. Enviar los bytes del ticket

	log.Printf("📄 Simulando impresión en %s (%s:%d)", printer.Name, printer.IPAddress, printer.Port)
	log.Printf("   Orden: %s | Mesa: %d | Estación: %s", ticket.OrderNumber, ticket.TableNumber, ticket.StationName)
	log.Printf("   Items: %d", len(ticket.Items))

	// Simular delay de red/impresora
	time.Sleep(100 * time.Millisecond)

	// TODO: Implementar lógica real según printer.PrinterType
	switch printer.PrinterType {
	case domain.PrinterTypeESCPOS:
		// Implementar comandos ESC/POS
		return nil
	case domain.PrinterTypePDF:
		// Generar PDF
		return nil
	case domain.PrinterTypeRaw:
		// Envío raw
		return nil
	default:
		return fmt.Errorf("tipo de impresora no soportado: %s", printer.PrinterType)
	}
}

// GetTicketsPreview obtiene una vista previa de los tickets sin imprimirlos
func (s *KitchenTicketService) GetTicketsPreview(orderID uuid.UUID) (*domain.StationTicketsResponse, error) {
	tickets, err := s.GenerateKitchenTickets(orderID)
	if err != nil {
		return nil, err
	}

	return &domain.StationTicketsResponse{
		OrderID: orderID,
		Tickets: tickets,
	}, nil
}

