// =================================================================
// ARCHIVO 1: /internal/websocket/hub.go (CORREGIDO)
// Propósito: Usar un sistema de mensajes genérico para el WebSocket.
// =================================================================
package websocket

import (
	"encoding/json"
	"log"

	"github.com/gofiber/contrib/websocket"
)

// Message define la estructura de un mensaje WebSocket.
type Message struct {
	Type    string      `json:"type"`    // ej: "NEW_PENDING_ORDER", "ORDER_STATUS_UPDATED"
	Payload interface{} `json:"payload"` // Los datos del mensaje (ej: el objeto Order)
}

// ClientInfo almacena información adicional del cliente
type ClientInfo struct {
	Conn   *websocket.Conn
	UserID string
	Role   string
}

// Hub mantiene el conjunto de clientes activos.
type Hub struct {
	clients    map[*websocket.Conn]*ClientInfo
	broadcast  chan []byte
	Register   chan *ClientInfo
	Unregister chan *websocket.Conn
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		Register:   make(chan *ClientInfo),
		Unregister: make(chan *websocket.Conn),
		clients:    make(map[*websocket.Conn]*ClientInfo),
	}
}

// Run inicia el hub en una goroutine.
func (h *Hub) Run() {
	for {
		select {
		case clientInfo := <-h.Register:
			for connection, existing := range h.clients {
				if existing.UserID == clientInfo.UserID && existing.Role == clientInfo.Role {
					log.Printf("♻️ Reemplazando conexión WebSocket previa. Role: %s, UserID: %s", existing.Role, existing.UserID)
					delete(h.clients, connection)
					_ = connection.Close()
				}
			}
			h.clients[clientInfo.Conn] = clientInfo
			log.Printf("✅ Nuevo cliente WebSocket conectado. Role: %s, UserID: %s, Total clientes: %d",
				clientInfo.Role, clientInfo.UserID, len(h.clients))
		case connection := <-h.Unregister:
			if clientInfo, ok := h.clients[connection]; ok {
				delete(h.clients, connection)
				log.Printf("👋 Cliente WebSocket desconectado. Role: %s, Clientes restantes: %d",
					clientInfo.Role, len(h.clients))
			}
		case message := <-h.broadcast:
			for connection := range h.clients {
				if err := connection.WriteMessage(websocket.TextMessage, message); err != nil {
					log.Println("❌ Error al escribir mensaje a cliente:", err)
					h.Unregister <- connection
					connection.Close()
				}
			}
		}
	}
}

// BroadcastMessage envía un mensaje a todos los clientes conectados.
func (h *Hub) BroadcastMessage(msgType string, payload interface{}) {
	message := Message{
		Type:    msgType,
		Payload: payload,
	}
	jsonMessage, err := json.Marshal(message)
	if err != nil {
		log.Println("❌ Error al convertir mensaje a JSON:", err)
		return
	}
	log.Printf("📡 Broadcast: Enviando mensaje tipo '%s' a %d clientes", msgType, len(h.clients))
	h.broadcast <- jsonMessage
}

// BroadcastToRole envía un mensaje solo a clientes con un rol específico.
func (h *Hub) BroadcastToRole(role string, msgType string, payload interface{}) {
	message := Message{
		Type:    msgType,
		Payload: payload,
	}
	jsonMessage, err := json.Marshal(message)
	if err != nil {
		log.Println("❌ Error al convertir mensaje a JSON:", err)
		return
	}

	sentCount := 0
	for conn, clientInfo := range h.clients {
		if clientInfo.Role == role {
			if err := conn.WriteMessage(websocket.TextMessage, jsonMessage); err != nil {
				log.Printf("❌ Error al enviar mensaje a cliente %s (role: %s): %v", clientInfo.UserID, role, err)
				h.Unregister <- conn
				conn.Close()
			} else {
				sentCount++
			}
		}
	}
	log.Printf("📡 BroadcastToRole: Enviando mensaje tipo '%s' a %d clientes con rol '%s'", msgType, sentCount, role)
}
