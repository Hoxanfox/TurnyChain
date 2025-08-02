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

// Hub mantiene el conjunto de clientes activos.
type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	Register   chan *websocket.Conn
	Unregister chan *websocket.Conn
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		Register:   make(chan *websocket.Conn),
		Unregister: make(chan *websocket.Conn),
		clients:    make(map[*websocket.Conn]bool),
	}
}

// Run inicia el hub en una goroutine.
func (h *Hub) Run() {
	for {
		select {
		case connection := <-h.Register:
			h.clients[connection] = true
			log.Println("Nuevo cliente WebSocket conectado. Clientes totales:", len(h.clients))
		case connection := <-h.Unregister:
			if _, ok := h.clients[connection]; ok {
				delete(h.clients, connection)
				log.Println("Cliente WebSocket desconectado. Clientes restantes:", len(h.clients))
			}
		case message := <-h.broadcast:
			for connection := range h.clients {
				if err := connection.WriteMessage(websocket.TextMessage, message); err != nil {
					log.Println("Error al escribir mensaje a cliente:", err)
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
		log.Println("Error al convertir mensaje a JSON:", err)
		return
	}
	h.broadcast <- jsonMessage
}