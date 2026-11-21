package main

import (
	"log"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
)

// Zona horaria del restaurante para definir el "día de trabajo".
const businessTimezone = "America/Bogota"

// StartDayResetWorker implementa el reinicio automático del día: las reservas
// de items del menú solo viven durante el día de trabajo, así que al cruzar la
// medianoche se borran todas y se avisa a los clientes (evento DAY_RESET) para
// que vacíen sus carritos. También limpia reservas huérfanas al arrancar el
// backend, por si el proceso estuvo caído durante el cambio de día.
func StartDayResetWorker(stockService service.StockService) {
	if affected, err := stockService.ResetDayReservations(); err != nil {
		log.Printf("⚠️ [DayResetWorker] No se pudieron limpiar las reservas del día anterior: %v", err)
	} else if affected > 0 {
		log.Printf("🌅 [DayResetWorker] Reservas del día anterior liberadas al iniciar: %d", affected)
	}

	go func() {
		log.Println("⚙️ [DayResetWorker] iniciado: liberará las reservas de items al cambiar el día.")
		for {
			wait := timeUntilNextMidnight()
			log.Printf("🌅 [DayResetWorker] Próximo reinicio de reservas en %s", wait.Round(time.Second))
			time.Sleep(wait)

			affected, err := stockService.ResetDayReservations()
			if err != nil {
				log.Printf("❌ [DayResetWorker] Error al reiniciar las reservas del día: %v", err)
				continue
			}
			log.Printf("🌅 [DayResetWorker] Nuevo día de trabajo: se liberaron %d reservas", affected)
		}
	}()
}

// timeUntilNextMidnight calcula cuánto falta para la próxima medianoche en la
// zona horaria del restaurante.
func timeUntilNextMidnight() time.Duration {
	loc, err := time.LoadLocation(businessTimezone)
	if err != nil {
		// Fallback seguro si la base de datos de zonas horarias no está disponible.
		loc = time.UTC
	}
	now := time.Now().In(loc)
	next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, loc)
	return next.Sub(now)
}
