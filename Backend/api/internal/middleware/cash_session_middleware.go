package middleware

import (
	"log"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/gofiber/fiber/v2"
)

// CashSessionMiddleware ensures there is an open cash session before allowing operations like creating orders or expenses.
func CashSessionMiddleware(cashRepo repository.CashRegisterRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		session, err := cashRepo.GetOpenSession()
		if err != nil {
			log.Printf("❌ [CashSessionMiddleware] Error getting open session: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Error checking cash session status",
			})
		}

		if session == nil {
			log.Printf("⚠️ [CashSessionMiddleware] Blocked request: Cash register is CLOSED.")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "CASH_REGISTER_CLOSED",
				"message": "La caja está cerrada. Debes abrir una sesión de caja antes de realizar esta operación.",
			})
		}

		loc := time.Local
		if bogota, err := time.LoadLocation("America/Bogota"); err == nil {
			loc = bogota
		}
		now := time.Now().In(loc)
		startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
		openLocal := session.OpenTime.In(loc)
		sessionDay := time.Date(openLocal.Year(), openLocal.Month(), openLocal.Day(), 0, 0, 0, 0, loc)

		if session.Status == "open" && sessionDay.Before(startOfToday) {
			session.Status = "pending_close"
			session.UpdatedAt = time.Now()
			if err := cashRepo.CloseSession(session); err != nil {
				log.Printf("❌ [CashSessionMiddleware] No se pudo marcar la caja pendiente de cierre: %v", err)
			}
		}

		if session.Status == "pending_close" {
			log.Printf("⚠️ [CashSessionMiddleware] Blocked request: Cash register is PENDING_CLOSE.")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "CASH_REGISTER_PENDING_CLOSE",
				"message": "Tienes un cierre de caja pendiente del día anterior. Por favor, realiza el arqueo antes de continuar.",
			})
		}

		// Inject the current session ID into the locals so the handler can use it
		c.Locals("cash_session_id", session.ID)

		return c.Next()
	}
}
