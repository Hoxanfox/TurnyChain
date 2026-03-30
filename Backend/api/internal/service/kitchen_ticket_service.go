// =================================================================
// Kitchen Ticket Service
// Gestiona la generación y envío de tickets cortados por estación
// =================================================================
package service

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/utils"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

const (
	maxPrintRetries      = 3
	printQueueBufferSize = 256
	printWorkers         = 2
)

type printJob struct {
	orderID uuid.UUID
}

type KitchenTicketService struct {
	orderRepo    repository.OrderRepository
	printerRepo  *repository.PrinterRepository
	stationRepo  *repository.StationRepository
	wsHub        *wshub.Hub
	printerMutex sync.Mutex             // Mutex global para serializar impresiones
	ipLocks      map[string]*sync.Mutex // Mutex por IP para impresoras que comparten dirección
	ipLocksGuard sync.RWMutex           // Protege el mapa de ipLocks
	printQueue   chan printJob
}

func NewKitchenTicketService(
	orderRepo repository.OrderRepository,
	printerRepo *repository.PrinterRepository,
	stationRepo *repository.StationRepository,
	wsHub *wshub.Hub,
) *KitchenTicketService {
	svc := &KitchenTicketService{
		orderRepo:   orderRepo,
		printerRepo: printerRepo,
		stationRepo: stationRepo,
		wsHub:       wsHub,
		ipLocks:     make(map[string]*sync.Mutex),
		printQueue:  make(chan printJob, printQueueBufferSize),
	}
	svc.startPrintWorkers()

	return svc
}

func (s *KitchenTicketService) startPrintWorkers() {
	for i := 0; i < printWorkers; i++ {
		go func(workerID int) {
			for job := range s.printQueue {
				log.Printf("🧾 [PrintQueue] Worker %d procesando orden %s", workerID, job.orderID)
				s.processPrintJob(job.orderID)
			}
		}(i + 1)
	}
}

func (s *KitchenTicketService) EnqueueOrderPrint(orderID uuid.UUID) error {
	if _, err := s.orderRepo.UpdateOrderPrintStatus(orderID, "pending", 0, nil, nil); err != nil {
		return fmt.Errorf("error marcando orden en cola de impresion: %w", err)
	}

	select {
	case s.printQueue <- printJob{orderID: orderID}:
		log.Printf("📥 [PrintQueue] Orden %s agregada a la cola", orderID)
		return nil
	default:
		errText := "cola de impresion llena"
		if _, updateErr := s.orderRepo.UpdateOrderPrintStatus(orderID, "failed", 0, &errText, nil); updateErr != nil {
			log.Printf("❌ [PrintQueue] Error actualizando estado tras cola llena: %v", updateErr)
		}
		return fmt.Errorf("%s", errText)
	}
}

func (s *KitchenTicketService) processPrintJob(orderID uuid.UUID) {
	var lastErr string

	for attempt := 1; attempt <= maxPrintRetries; attempt++ {
		if _, err := s.orderRepo.UpdateOrderPrintStatus(orderID, "processing", 1, nil, nil); err != nil {
			log.Printf("❌ [PrintQueue] Error actualizando estado processing para %s: %v", orderID, err)
		}

		result, err := s.PrintOrderAllDestinations(orderID)
		if err == nil && result != nil && result.Success {
			now := time.Now()
			if _, updateErr := s.orderRepo.UpdateOrderPrintStatus(orderID, "printed", 0, nil, &now); updateErr != nil {
				log.Printf("❌ [PrintQueue] Error marcando orden impresa %s: %v", orderID, updateErr)
			}
			s.broadcastOrderPrintStatus(orderID)
			return
		}

		if err != nil {
			lastErr = err.Error()
		} else if result != nil {
			lastErr = result.Message
			if len(result.FailedPrints) > 0 {
				lastErr = result.FailedPrints[0].Error
			}
		} else {
			lastErr = "error desconocido al imprimir"
		}

		if attempt < maxPrintRetries {
			backoff := time.Duration(attempt) * time.Second
			log.Printf("⚠️ [PrintQueue] Reintentando orden %s en %s (intento %d/%d)", orderID, backoff, attempt+1, maxPrintRetries)
			time.Sleep(backoff)
		}
	}

	if _, err := s.orderRepo.UpdateOrderPrintStatus(orderID, "failed", 0, &lastErr, nil); err != nil {
		log.Printf("❌ [PrintQueue] Error marcando orden fallida %s: %v", orderID, err)
	}
	s.broadcastOrderPrintStatus(orderID)
}

func (s *KitchenTicketService) broadcastOrderPrintStatus(orderID uuid.UUID) {
	if s.wsHub == nil {
		return
	}

	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		log.Printf("❌ [PrintQueue] Error obteniendo orden para broadcast %s: %v", orderID, err)
		return
	}

	s.wsHub.BroadcastMessage("ORDER_PRINT_STATUS_UPDATED", order)
	s.wsHub.BroadcastMessage("ORDER_UPDATED", order)
}

// getMutexForIP obtiene o crea un mutex para una dirección IP específica
// Esto asegura que múltiples impresoras en la misma IP no intenten conectarse simultáneamente
func (s *KitchenTicketService) getMutexForIP(ipAddress string) *sync.Mutex {
	s.ipLocksGuard.RLock()
	if mutex, exists := s.ipLocks[ipAddress]; exists {
		s.ipLocksGuard.RUnlock()
		return mutex
	}
	s.ipLocksGuard.RUnlock()

	// Crear nuevo mutex para esta IP
	s.ipLocksGuard.Lock()
	defer s.ipLocksGuard.Unlock()

	// Double-check después de adquirir el lock de escritura
	if mutex, exists := s.ipLocks[ipAddress]; exists {
		return mutex
	}

	mutex := &sync.Mutex{}
	s.ipLocks[ipAddress] = mutex
	return mutex
}

// GenerateKitchenTickets genera los tickets cortados para una orden
// Agrupa los items por estación según su categoría
func (s *KitchenTicketService) GenerateKitchenTickets(orderID uuid.UUID) ([]domain.KitchenTicket, error) {
	// 1. Obtener la orden completa con todos sus items
	order, err := s.orderRepo.GetOrderByID(orderID)
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
			kitchenItem := domain.KitchenTicketItem{
				MenuItemName:   item.MenuItemName,
				Quantity:       item.Quantity,
				Customizations: &item.Customizations,
				IsTakeout:      item.IsTakeout,
				Price:          int(item.PriceAtOrder),
			}

			// Manejar Notes que puede ser nil
			if item.Notes != nil {
				kitchenItem.Notes = *item.Notes
			}

			stationItems[stationID] = append(stationItems[stationID], kitchenItem)
		}
	}

	// 3. Generar tickets por estación
	var tickets []domain.KitchenTicket
	orderNumber := fmt.Sprintf("ORD-%s", orderID.String()[:8])

	for stationID, items := range stationItems {
		info := stationInfo[stationID]

		// Usar delivery_notes como nota especial si existe
		specialNotes := ""
		if order.DeliveryNotes != nil && *order.DeliveryNotes != "" {
			specialNotes = *order.DeliveryNotes
		}
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
			SpecialNotes: specialNotes,
		}

		tickets = append(tickets, ticket)
	}

	return tickets, nil
}

// PrintGlobalOrderTicket imprime la comanda completa en la estación 'Caja'
// Útil para control administrativo o precuenta.
func (s *KitchenTicketService) PrintGlobalOrderTicket(orderID uuid.UUID) error {
	// 1. Obtener la orden completa
	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return fmt.Errorf("error al obtener orden: %w", err)
	}
	if order == nil {
		return fmt.Errorf("orden no encontrada")
	}

	// 2. Mapear TODOS los ítems de la orden a KitchenTicketItem
	var allItems []domain.KitchenTicketItem
	for _, item := range order.Items {
		kitchenItem := domain.KitchenTicketItem{
			MenuItemName:   item.MenuItemName,
			Quantity:       item.Quantity,
			Customizations: &item.Customizations,
			IsTakeout:      item.IsTakeout,
			Price:          int(item.PriceAtOrder),
		}
		if item.Notes != nil {
			kitchenItem.Notes = *item.Notes
		}
		allItems = append(allItems, kitchenItem)
	}

	// 3. Crear el ticket global
	specialNotes := ""
	if order.DeliveryNotes != nil {
		specialNotes = *order.DeliveryNotes
	}

	globalTicket := domain.KitchenTicket{
		OrderID:      order.ID,
		OrderNumber:  fmt.Sprintf("ORD-%s", order.ID.String()[:8]),
		TableNumber:  order.TableNumber,
		WaiterName:   order.WaiterName,
		StationID:    uuid.Nil, // Es un ticket global, no pertenece a una sola estación de preparación
		StationName:  "CAJA GLOBAL",
		Items:        allItems,
		CreatedAt:    order.CreatedAt,
		OrderType:    order.OrderType,
		SpecialNotes: specialNotes,
	}

	// 4. Buscar la estación llamada "Caja" para obtener su impresora
	stations, err := s.stationRepo.GetAll()
	if err != nil {
		return fmt.Errorf("error al obtener estaciones: %w", err)
	}

	var cajaStationID uuid.UUID
	for _, st := range stations {
		// Validamos ignorando mayúsculas/minúsculas para mayor seguridad
		if st.Name == "Caja" || st.Name == "CAJA" {
			cajaStationID = st.ID
			break
		}
	}

	if cajaStationID == uuid.Nil {
		return fmt.Errorf("la estación 'Caja' no está configurada en el sistema")
	}

	// 5. Obtener impresoras de la estación Caja
	printers, err := s.printerRepo.GetByStationID(cajaStationID)
	if err != nil || len(printers) == 0 {
		return fmt.Errorf("no hay impresoras configuradas para la estación Caja")
	}

	// 6. Enviar a la impresora principal de Caja
	return s.sendToPrinter(printers[0], globalTicket)
}

// PrintGlobalOrderTicketResponse imprime la comanda global de Caja y devuelve una respuesta estándar.
func (s *KitchenTicketService) PrintGlobalOrderTicketResponse(orderID uuid.UUID) (*domain.PrintResponse, error) {
	err := s.PrintGlobalOrderTicket(orderID)
	if err != nil {
		return &domain.PrintResponse{
			Success:     false,
			Message:     "Error al imprimir ticket global de Caja",
			TicketsSent: 0,
			FailedPrints: []domain.FailedPrintInfo{
				{StationName: "Caja", Error: err.Error()},
			},
		}, nil
	}

	return &domain.PrintResponse{
		Success:     true,
		Message:     "Ticket global enviado a Caja correctamente",
		TicketsSent: 1,
	}, nil
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
func (s *KitchenTicketService) sendToPrinter(printer domain.Printer, ticket domain.KitchenTicket) error {
	log.Printf("📄 Enviando ticket a %s (%s:%d)", printer.Name, printer.IPAddress, printer.Port)
	log.Printf("   Orden: %s | Mesa: %d | Estación: %s", ticket.OrderNumber, ticket.TableNumber, ticket.StationName)
	log.Printf("   Items: %d", len(ticket.Items))

	// Obtener el mutex para esta IP para evitar conexiones simultáneas
	ipKey := fmt.Sprintf("%s:%d", printer.IPAddress, printer.Port)
	mutex := s.getMutexForIP(ipKey)

	// Bloquear para esta IP específica
	mutex.Lock()
	defer mutex.Unlock()

	// Implementar lógica según el tipo de impresora
	switch printer.PrinterType {
	case domain.PrinterTypeESCPOS:
		// Impresión ESC/POS real
		escposPrinter := utils.NewESCPOSPrinter(printer.IPAddress, printer.Port)
		err := escposPrinter.PrintKitchenTicket(ticket)
		if err != nil {
			return fmt.Errorf("error al imprimir ticket ESC/POS: %w", err)
		}
		log.Printf("✅ Ticket impreso exitosamente en %s", printer.Name)

		// Pequeño delay después de imprimir para que la impresora libere el socket
		time.Sleep(300 * time.Millisecond)

		return nil

	case domain.PrinterTypePDF:
		// TODO: Implementar generación de PDF
		log.Printf("⚠️  Generación de PDF no implementada aún")
		return fmt.Errorf("generación de PDF no implementada")

	case domain.PrinterTypeRaw:
		// TODO: Implementar envío raw
		log.Printf("⚠️  Envío raw no implementado aún")
		return fmt.Errorf("envío raw no implementado")

	default:
		return fmt.Errorf("tipo de impresora no soportado: %s", printer.PrinterType)
	}
}

// GetTicketsPreview obtiene una vista previa enriquecida de los tickets sin imprimirlos
func (s *KitchenTicketService) GetTicketsPreview(orderID uuid.UUID) (*domain.StationTicketsResponse, error) {
	// Obtener la orden para llenar los campos de cabecera
	order, err := s.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return nil, fmt.Errorf("error al obtener orden: %w", err)
	}
	if order == nil {
		return nil, fmt.Errorf("orden no encontrada")
	}

	tickets, err := s.GenerateKitchenTickets(orderID)
	if err != nil {
		return nil, err
	}

	// Construir summary y totales
	totalItems := 0
	summary := make([]domain.StationSummary, 0, len(tickets))
	for _, t := range tickets {
		stationQty := 0
		for _, item := range t.Items {
			stationQty += item.Quantity
			totalItems += item.Quantity
		}
		summary = append(summary, domain.StationSummary{
			StationID:     t.StationID,
			StationName:   t.StationName,
			UniqueItems:   len(t.Items),
			TotalQuantity: stationQty,
		})
	}

	orderNumber := fmt.Sprintf("ORD-%s", orderID.String()[:8])

	return &domain.StationTicketsResponse{
		OrderID:       orderID,
		OrderNumber:   orderNumber,
		TableNumber:   order.TableNumber,
		WaiterName:    order.WaiterName,
		OrderType:     order.OrderType,
		TotalStations: len(tickets),
		TotalItems:    totalItems,
		Summary:       summary,
		Tickets:       tickets,
	}, nil
}

// GetTicketsPreviewByStation obtiene la vista previa de la comanda de una sola estación
func (s *KitchenTicketService) GetTicketsPreviewByStation(orderID uuid.UUID, stationID uuid.UUID) (*domain.KitchenTicket, error) {
	tickets, err := s.GenerateKitchenTickets(orderID)
	if err != nil {
		return nil, err
	}

	for _, t := range tickets {
		if t.StationID == stationID {
			return &t, nil
		}
	}

	return nil, fmt.Errorf("esta orden no tiene items asignados a la estación indicada")
}

// PrintKitchenTicketsByStation imprime solo la comanda de una estación específica
func (s *KitchenTicketService) PrintKitchenTicketsByStation(orderID uuid.UUID, stationID uuid.UUID) (*domain.PrintResponse, error) {
	ticket, err := s.GetTicketsPreviewByStation(orderID, stationID)
	if err != nil {
		return nil, err
	}

	// Obtener impresoras de la estación
	printers, err := s.printerRepo.GetByStationIDs([]uuid.UUID{stationID})
	if err != nil || len(printers) == 0 {
		return &domain.PrintResponse{
			Success:     false,
			Message:     "No hay impresoras configuradas para esta estación",
			TicketsSent: 0,
			Tickets:     []domain.KitchenTicket{*ticket},
		}, nil
	}

	err = s.sendToPrinter(printers[0], *ticket)
	if err != nil {
		return &domain.PrintResponse{
			Success:     false,
			Message:     fmt.Sprintf("Error al imprimir en %s: %s", printers[0].Name, err.Error()),
			TicketsSent: 0,
			FailedPrints: []domain.FailedPrintInfo{
				{StationName: ticket.StationName, PrinterName: printers[0].Name, Error: err.Error()},
			},
			Tickets: []domain.KitchenTicket{*ticket},
		}, nil
	}

	return &domain.PrintResponse{
		Success:     true,
		Message:     fmt.Sprintf("Ticket impreso en %s correctamente", ticket.StationName),
		TicketsSent: 1,
		Tickets:     []domain.KitchenTicket{*ticket},
	}, nil
}

// PrintOrderAllDestinations orquesta la impresión en cocina (cortados) y en caja (global)
func (s *KitchenTicketService) PrintOrderAllDestinations(orderID uuid.UUID) (*domain.PrintResponse, error) {
	// 1. Mandar a imprimir por estaciones (Cocina, Barra, etc.)
	result, err := s.PrintKitchenTickets(orderID, false)
	if err != nil {
		log.Printf("⚠️ Error parcial en impresión de estaciones: %v", err)
		// No retornamos error aquí para intentar imprimir al menos en caja
	}

	// 2. Esperar un momento para que las impresoras de estaciones terminen y liberen sus sockets
	// Esto es crítico cuando múltiples estaciones comparten la misma impresora física
	time.Sleep(500 * time.Millisecond)
	log.Printf("⏱️  Esperando liberación de sockets de impresoras...")

	// 3. Mandar a imprimir la comanda global en la estación 'Caja'
	errCaja := s.PrintGlobalOrderTicket(orderID)
	if errCaja != nil {
		log.Printf("❌ Error en impresión de Caja: %v", errCaja)
		if result != nil {
			result.FailedPrints = append(result.FailedPrints, domain.FailedPrintInfo{
				StationName: "Caja",
				Error:       errCaja.Error(),
			})
			result.Success = false
		}
	} else {
		log.Printf("✅ Comanda global enviada a Caja correctamente")
		if result != nil {
			result.TicketsSent++
		}
	}

	return result, err
}
