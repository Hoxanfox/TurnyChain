// =================================================================
// BACKEND: ARCHIVO 2: /internal/handler/websocket_handler.go (CORREGIDO)
// Propósito: Manejar las nuevas conexiones WebSocket.
// =================================================================
package handler

import (
	"log"
	"github.com/gofiber/contrib/websocket"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
)

type WebSocketHandler struct {
	hub *wshub.Hub
}

func NewWebSocketHandler(h *wshub.Hub) *WebSocketHandler {
	return &WebSocketHandler{hub: h}
}

func (h *WebSocketHandler) HandleConnection(c *websocket.Conn) {
	// Registrar el nuevo cliente en el hub
	h.hub.Register <- c // CORRECCIÓN: Usar el campo exportado
	defer func() {
		// Al terminar la conexión, desregistrarlo
		h.hub.Unregister <- c // CORRECCIÓN: Usar el campo exportado
		c.Close()
	}()

	// Bucle para mantener la conexión viva y manejar mensajes del cliente si fuera necesario
	for {
		_, _, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("Error de lectura de WebSocket:", err)
			}
			break // Salir del bucle si el cliente se desconecta
		}
	}
}