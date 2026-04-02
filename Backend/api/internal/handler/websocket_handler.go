// =================================================================
// BACKEND: ARCHIVO 2: /internal/handler/websocket_handler.go (CORREGIDO)
// Propósito: Manejar las nuevas conexiones WebSocket.
// =================================================================
package handler

import (
	"log"

	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/gofiber/contrib/websocket"
)

type WebSocketHandler struct {
	hub *wshub.Hub
}

func NewWebSocketHandler(h *wshub.Hub) *WebSocketHandler {
	return &WebSocketHandler{hub: h}
}

func (h *WebSocketHandler) HandleConnection(c *websocket.Conn) {
	// Extraer información del cliente desde query params
	userID := c.Query("user_id", "unknown")
	role := c.Query("role", "unknown")

	// Crear ClientInfo
	clientInfo := &wshub.ClientInfo{
		Conn:   c,
		UserID: userID,
		Role:   role,
	}

	// Registrar el nuevo cliente en el hub
	h.hub.Register <- clientInfo
	defer func() {
		// El hub centraliza el cierre/desregistro para evitar carreras.
		h.hub.Unregister <- c
	}()

	log.Printf("🔌 Nueva conexión WebSocket establecida. UserID: %s, Role: %s", userID, role)

	// Bucle para mantener la conexión viva y manejar mensajes del cliente si fuera necesario
	for {
		_, _, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("⚠️ Error de lectura de WebSocket (UserID: %s, Role: %s): %v", userID, role, err)
			}
			break // Salir del bucle si el cliente se desconecta
		}
	}
}
