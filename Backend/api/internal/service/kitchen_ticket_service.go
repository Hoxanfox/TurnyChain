// =================================================================
// Kitchen Ticket Service
// Gestiona la generación y envío de tickets cortados por estación
// =================================================================
package service

import (
	"fmt"
	"log"
	"net"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/domain"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/utils"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/google/uuid"
)

const (
	maxPrintRetries         = 3
	printQueueBufferSize    = 256
	printWorkers            = 2
	recoveryModeEnv         = "PRINT_RECOVERY_MODE"
	recoveryLookbackEnv     = "PRINT_RECOVERY_LOOKBACK_MINUTES"
	autoRetryEnabledEnv     = "PRINT_AUTO_RETRY_ENABLED"
	autoRetryIntervalEnv    = "PRINT_AUTO_RETRY_INTERVAL_SECONDS"
	autoRetryLookbackEnv    = "PRINT_AUTO_RETRY_LOOKBACK_MINUTES"
	autoRetryCooldownEnv    = "PRINT_AUTO_RETRY_COOLDOWN_MINUTES"
	autoRetryCooldownSecEnv = "PRINT_AUTO_RETRY_COOLDOWN_SECONDS"
	autoRetryMaxEnv         = "PRINT_AUTO_RETRY_MAX_ATTEMPTS"
	healthcheckTimeoutMs    = "PRINT_HEALTHCHECK_TIMEOUT_MS"
)

type printQueueSnapshot struct {
	QueuedOrderIDs     []string `json:"queued_order_ids"`
	ProcessingOrderIDs []string `json:"processing_order_ids"`
	QueuedCount        int      `json:"queued_count"`
	ProcessingCount    int      `json:"processing_count"`
	UpdatedAt          string   `json:"updated_at"`
}

type printJob struct {
	orderID uuid.UUID
}

type KitchenTicketService struct {
	orderRepo    repository.OrderRepository
	printerRepo  *repository.PrinterRepository
	stationRepo  *repository.StationRepository
	wsHub        *wshub.Hub
	menuRepo     repository.MenuRepository
	printerMutex sync.Mutex             // Mutex global para serializar impresiones
	ipLocks      map[string]*sync.Mutex // Mutex por IP para impresoras que comparten dirección
	ipLocksGuard sync.RWMutex           // Protege el mapa de ipLocks
	printQueue   chan printJob
	queueStateMu sync.Mutex
	queuedIDs    []uuid.UUID
	processing   map[uuid.UUID]time.Time
}

func NewKitchenTicketService(
	orderRepo repository.OrderRepository,
	printerRepo *repository.PrinterRepository,
	stationRepo *repository.StationRepository,
	wsHub *wshub.Hub,
	menuRepo repository.MenuRepository,
) *KitchenTicketService {
	svc := &KitchenTicketService{
		orderRepo:   orderRepo,
		printerRepo: printerRepo,
		stationRepo: stationRepo,
		wsHub:       wsHub,
		menuRepo:    menuRepo,
		ipLocks:     make(map[string]*sync.Mutex),
		printQueue:  make(chan printJob, printQueueBufferSize),
		processing:  make(map[uuid.UUID]time.Time),
	}
	svc.startPrintWorkers()
	go svc.recoverPendingPrintJobs()
	go svc.startAutoRetryFailedLoop()

	return svc
}

func (s *KitchenTicketService) startAutoRetryFailedLoop() {
	enabled, intervalSeconds, lookbackMinutes, cooldownSeconds, maxAttempts := s.getAutoRetryConfig()
	if !enabled {
		log.Printf("ℹ️ [PrintQueue] Auto-retry de fallidas deshabilitado (%s=false)", autoRetryEnabledEnv)
		return
	}

	log.Printf("♻️ [PrintQueue] Auto-retry activo: interval=%ds lookback=%dmin cooldown=%ds max_attempts=%d",
		intervalSeconds, lookbackMinutes, cooldownSeconds, maxAttempts)

	ticker := time.NewTicker(time.Duration(intervalSeconds) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		queued, selected, err := s.EnqueueFailedRecentPrints(nil, lookbackMinutes, cooldownSeconds, maxAttempts)
		if err != nil {
			log.Printf("❌ [PrintQueue] Auto-retry fallidas error: %v", err)
			continue
		}
		if queued > 0 {
			log.Printf("♻️ [PrintQueue] Auto-retry encoló %d/%d ordenes fallidas recientes", queued, selected)
		}
	}
}

func (s *KitchenTicketService) getAutoRetryConfig() (bool, int, int, int, int) {
	enabled := strings.EqualFold(strings.TrimSpace(os.Getenv(autoRetryEnabledEnv)), "true")
	intervalSeconds := 60
	lookbackMinutes := 180
	cooldownSeconds := 5 * 60
	maxAttempts := 8

	if raw := strings.TrimSpace(os.Getenv(autoRetryIntervalEnv)); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			intervalSeconds = parsed
		}
	}
	if raw := strings.TrimSpace(os.Getenv(autoRetryLookbackEnv)); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
			lookbackMinutes = parsed
		}
	}
	if raw := strings.TrimSpace(os.Getenv(autoRetryCooldownSecEnv)); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			cooldownSeconds = parsed
		}
	} else if raw := strings.TrimSpace(os.Getenv(autoRetryCooldownEnv)); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			cooldownSeconds = parsed * 60
		}
	}
	if raw := strings.TrimSpace(os.Getenv(autoRetryMaxEnv)); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
			maxAttempts = parsed
		}
	}

	return enabled, intervalSeconds, lookbackMinutes, cooldownSeconds, maxAttempts
}

func (s *KitchenTicketService) recoverPendingPrintJobs() {
	enabled, createdAfter, lastAttemptAfter, recoveryLabel := s.getRecoveryFilters()
	if !enabled {
		log.Printf("ℹ️ [PrintQueue] Recovery deshabilitado por %s=off", recoveryModeEnv)
		return
	}

	statuses := []string{"queued", "printing"}
	orderIDs, err := s.orderRepo.GetRecoverableOrderIDsByPrintStatus(statuses, createdAfter, lastAttemptAfter)
	if err != nil {
		log.Printf("❌ [PrintQueue] Error recuperando ordenes pendientes al iniciar: %v", err)
		return
	}

	if len(orderIDs) == 0 {
		log.Printf("ℹ️ [PrintQueue] Recovery sin pendientes para criterio %s", recoveryLabel)
		return
	}

	log.Printf("🔁 [PrintQueue] Recuperando %d ordenes pendientes de impresion (%s)", len(orderIDs), recoveryLabel)
	for _, orderID := range orderIDs {
		if err := s.enqueueOrderPrint(orderID, false); err != nil {
			log.Printf("❌ [PrintQueue] Error re-encolando orden %s al iniciar: %v", orderID, err)
		}
	}
}

func (s *KitchenTicketService) getRecoveryFilters() (bool, *time.Time, *time.Time, string) {
	mode := strings.TrimSpace(strings.ToLower(os.Getenv(recoveryModeEnv)))
	if mode == "" {
		mode = "recent"
	}

	now := time.Now().UTC()
	bogotaLoc, err := time.LoadLocation("America/Bogota")
	if err != nil {
		bogotaLoc = time.FixedZone("COT", -5*60*60)
	}
	nowBogota := now.In(bogotaLoc)
	dayStartBogota := time.Date(nowBogota.Year(), nowBogota.Month(), nowBogota.Day(), 0, 0, 0, 0, bogotaLoc)
	dayStart := dayStartBogota.UTC()
	lookbackMinutes := 180

	if raw := strings.TrimSpace(os.Getenv(recoveryLookbackEnv)); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			lookbackMinutes = parsed
		}
	}

	recent := now.Add(-time.Duration(lookbackMinutes) * time.Minute)
	formatLabel := func(t time.Time) string {
		return fmt.Sprintf("created_at >= %s (Bogota: %s)", t.Format(time.RFC3339), t.In(bogotaLoc).Format("2006-01-02 15:04:05 -07:00 MST"))
	}

	switch mode {
	case "off", "disabled", "none":
		return false, nil, nil, "disabled"
	case "all":
		return true, nil, nil, "all"
	case "today":
		return true, &dayStart, nil, formatLabel(dayStart)
	case "recent":
		return true, &recent, nil, formatLabel(recent)
	default:
		log.Printf("⚠️ [PrintQueue] Valor desconocido en %s=%s, usando modo recent", recoveryModeEnv, mode)
		return true, &recent, nil, formatLabel(recent)
	}
}

func (s *KitchenTicketService) startPrintWorkers() {
	for i := 0; i < printWorkers; i++ {
		go func(workerID int) {
			for job := range s.printQueue {
				s.markDequeuedToProcessing(job.orderID)
				log.Printf("🧾 [PrintQueue] Worker %d procesando orden %s", workerID, job.orderID)
				s.safeProcessPrintJob(job.orderID)
				s.markCompleted(job.orderID)
			}
		}(i + 1)
	}
}

func (s *KitchenTicketService) EnqueueOrderPrint(orderID uuid.UUID) error {
	return s.enqueueOrderPrint(orderID, false)
}

func (s *KitchenTicketService) EnqueueOrderPrintRetry(orderID uuid.UUID) error {
	return s.enqueueOrderPrint(orderID, true)
}

func (s *KitchenTicketService) EnqueueFailedRecentPrints(tableNumber *int, lookbackMinutes, cooldownSeconds, maxAttempts int) (int, int, error) {
	if lookbackMinutes < 0 {
		lookbackMinutes = 180
	}
	if cooldownSeconds <= 0 {
		cooldownSeconds = 5 * 60
	}
	if maxAttempts < 0 {
		maxAttempts = 8
	}

	now := time.Now().UTC()
	var createdAfter *time.Time
	if lookbackMinutes > 0 {
		t := now.Add(-time.Duration(lookbackMinutes) * time.Minute)
		createdAfter = &t
	}
	lastAttemptBefore := now.Add(-time.Duration(cooldownSeconds) * time.Second)

	orderIDs, err := s.orderRepo.GetRetryableFailedOrderIDs(createdAfter, lastAttemptBefore, maxAttempts, tableNumber)
	if err != nil {
		return 0, 0, fmt.Errorf("error consultando fallidas reintentables: %w", err)
	}

	if len(orderIDs) == 0 {
		return 0, 0, nil
	}

	queued := 0
	for _, orderID := range orderIDs {
		if err := s.enqueueOrderPrint(orderID, false); err != nil {
			log.Printf("❌ [PrintQueue] Error encolando fallida %s: %v", orderID, err)
			continue
		}
		queued++
	}

	return queued, len(orderIDs), nil
}

func (s *KitchenTicketService) enqueueOrderPrint(orderID uuid.UUID, allowOverwritePrinted bool) error {
	_, updated, err := s.orderRepo.UpdateOrderPrintStatusGuarded(orderID, "queued", 0, nil, nil, allowOverwritePrinted)
	if err != nil {
		return fmt.Errorf("error marcando orden en cola de impresion: %w", err)
	}

	if !updated {
		log.Printf("ℹ️ [PrintQueue] Orden %s ya esta impresa. No se re-encola automaticamente", orderID)
		return nil
	}

	select {
	case s.printQueue <- printJob{orderID: orderID}:
		s.markEnqueued(orderID)
		log.Printf("📥 [PrintQueue] Orden %s agregada a la cola", orderID)
		return nil
	default:
		log.Printf("⚠️ [PrintQueue] Cola llena para orden %s. Activando encolado diferido.", orderID)
		go s.retryEnqueue(orderID)
		return nil
	}
}

func (s *KitchenTicketService) retryEnqueue(orderID uuid.UUID) {
	for attempt := 1; attempt <= 5; attempt++ {
		time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)

		select {
		case s.printQueue <- printJob{orderID: orderID}:
			s.markEnqueued(orderID)
			log.Printf("📥 [PrintQueue] Orden %s re-encolada correctamente (intento %d/5)", orderID, attempt)
			return
		default:
			log.Printf("⚠️ [PrintQueue] Cola aun llena para orden %s (intento %d/5)", orderID, attempt)
		}
	}

	errText := "cola de impresion saturada tras reintentos"
	if _, _, updateErr := s.orderRepo.UpdateOrderPrintStatusGuarded(orderID, "failed", 1, &errText, nil, false); updateErr != nil {
		log.Printf("❌ [PrintQueue] Error actualizando estado tras saturacion %s: %v", orderID, updateErr)
	}
	s.broadcastOrderPrintStatus(orderID)
}

func (s *KitchenTicketService) markEnqueued(orderID uuid.UUID) {
	s.queueStateMu.Lock()
	defer s.queueStateMu.Unlock()

	if _, exists := s.processing[orderID]; exists {
		return
	}

	for _, id := range s.queuedIDs {
		if id == orderID {
			return
		}
	}

	s.queuedIDs = append(s.queuedIDs, orderID)
	s.broadcastQueueSnapshotLocked()
}

func (s *KitchenTicketService) markDequeuedToProcessing(orderID uuid.UUID) {
	s.queueStateMu.Lock()
	defer s.queueStateMu.Unlock()

	filtered := make([]uuid.UUID, 0, len(s.queuedIDs))
	for _, id := range s.queuedIDs {
		if id != orderID {
			filtered = append(filtered, id)
		}
	}
	s.queuedIDs = filtered
	s.processing[orderID] = time.Now().UTC()
	s.broadcastQueueSnapshotLocked()
}

func (s *KitchenTicketService) markCompleted(orderID uuid.UUID) {
	s.queueStateMu.Lock()
	defer s.queueStateMu.Unlock()

	delete(s.processing, orderID)
	s.broadcastQueueSnapshotLocked()
}

func (s *KitchenTicketService) buildQueueSnapshotLocked() printQueueSnapshot {
	queued := make([]string, 0, len(s.queuedIDs))
	for _, id := range s.queuedIDs {
		queued = append(queued, id.String())
	}

	processing := make([]string, 0, len(s.processing))
	for id := range s.processing {
		processing = append(processing, id.String())
	}

	return printQueueSnapshot{
		QueuedOrderIDs:     queued,
		ProcessingOrderIDs: processing,
		QueuedCount:        len(queued),
		ProcessingCount:    len(processing),
		UpdatedAt:          time.Now().UTC().Format(time.RFC3339),
	}
}

func (s *KitchenTicketService) broadcastQueueSnapshotLocked() {
	if s.wsHub == nil {
		return
	}

	snapshot := s.buildQueueSnapshotLocked()
	go s.wsHub.BroadcastMessage("PRINT_QUEUE_UPDATED", snapshot)
}

func (s *KitchenTicketService) safeProcessPrintJob(orderID uuid.UUID) {
	defer func() {
		if r := recover(); r != nil {
			errText := fmt.Sprintf("panic en worker de impresion: %v", r)
			log.Printf("❌ [PrintQueue] %s | orden %s", errText, orderID)
			if _, _, err := s.orderRepo.UpdateOrderPrintStatusGuarded(orderID, "failed", 1, &errText, nil, false); err != nil {
				log.Printf("❌ [PrintQueue] Error marcando failed tras panic %s: %v", orderID, err)
			}
			s.broadcastOrderPrintStatus(orderID)
		}
	}()

	s.processPrintJob(orderID)
}

func (s *KitchenTicketService) processPrintJob(orderID uuid.UUID) {
	reachable, healthErr := s.hasReachableActivePrinter()
	if healthErr != nil {
		log.Printf("⚠️ [PrintQueue] Health-check impresoras falló para orden %s: %v", orderID, healthErr)
	}
	if !reachable {
		errText := "impresoras offline: no hay impresoras activas alcanzables, reintenta cuando se restablezca la conectividad"
		if _, _, err := s.orderRepo.UpdateOrderPrintStatusGuarded(orderID, "failed", 1, &errText, nil, false); err != nil {
			log.Printf("❌ [PrintQueue] Error marcando failed por health-check %s: %v", orderID, err)
		}
		s.broadcastOrderPrintStatus(orderID)
		return
	}

	var lastErr string

	for attempt := 1; attempt <= maxPrintRetries; attempt++ {
		order, updated, err := s.orderRepo.UpdateOrderPrintStatusGuarded(orderID, "printing", attempt, nil, nil, false)
		if err != nil {
			log.Printf("❌ [PrintQueue] Error actualizando estado printing para %s: %v", orderID, err)
		} else if !updated && order != nil && order.PrintStatus == "printed" {
			log.Printf("ℹ️ [PrintQueue] Orden %s ya impresa. Se omite procesamiento duplicado", orderID)
			return
		}

		result, err := s.PrintOrderAllDestinations(orderID)
		if err == nil && result != nil && result.Success {
			now := time.Now()
			if _, _, updateErr := s.orderRepo.UpdateOrderPrintStatusGuarded(orderID, "printed", 0, nil, &now, false); updateErr != nil {
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

	if _, _, err := s.orderRepo.UpdateOrderPrintStatusGuarded(orderID, "failed", 0, &lastErr, nil, false); err != nil {
		log.Printf("❌ [PrintQueue] Error marcando orden fallida %s: %v", orderID, err)
	}
	s.broadcastOrderPrintStatus(orderID)
}

func (s *KitchenTicketService) hasReachableActivePrinter() (bool, error) {
	printers, err := s.printerRepo.GetAllActive()
	if err != nil {
		return false, err
	}
	if len(printers) == 0 {
		return false, nil
	}

	timeout := 800 * time.Millisecond
	if raw := strings.TrimSpace(os.Getenv(healthcheckTimeoutMs)); raw != "" {
		if parsed, parseErr := strconv.Atoi(raw); parseErr == nil && parsed > 0 {
			timeout = time.Duration(parsed) * time.Millisecond
		}
	}

	for _, printer := range printers {
		if printer.PrinterType != domain.PrinterTypeESCPOS {
			return true, nil
		}

		address := fmt.Sprintf("%s:%d", printer.IPAddress, printer.Port)
		conn, dialErr := net.DialTimeout("tcp", address, timeout)
		if dialErr == nil {
			_ = conn.Close()
			return true, nil
		}
	}

	return false, nil
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

			// Verificar si fue modificado
			isModified := false
			if item.Notes != nil && *item.Notes != "" {
				isModified = true
			} else {
				allIngredients, allAccompaniments, err := s.menuRepo.GetMenuItemDetails(item.MenuItemID)
				if err == nil {
					if len(item.Customizations.ActiveIngredients) < len(allIngredients) || len(item.Customizations.SelectedAccompaniments) < len(allAccompaniments) {
						isModified = true
					}
				}
			}

			// Agregar el item a la estación
			kitchenItem := domain.KitchenTicketItem{
				MenuItemName:   item.MenuItemName,
				Quantity:       item.Quantity,
				Customizations: &item.Customizations,
				IsTakeout:      item.IsTakeout,
				Price:          int(item.PriceAtOrder),
				IsModified:     isModified,
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
		isModified := false
		if item.Notes != nil && *item.Notes != "" {
			isModified = true
		} else {
			allIngredients, allAccompaniments, err := s.menuRepo.GetMenuItemDetails(item.MenuItemID)
			if err == nil {
				if len(item.Customizations.ActiveIngredients) < len(allIngredients) || len(item.Customizations.SelectedAccompaniments) < len(allAccompaniments) {
					isModified = true
				}
			}
		}

		kitchenItem := domain.KitchenTicketItem{
			MenuItemName:   item.MenuItemName,
			Quantity:       item.Quantity,
			Customizations: &item.Customizations,
			IsTakeout:      item.IsTakeout,
			Price:          int(item.PriceAtOrder),
			IsModified:     isModified,
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
