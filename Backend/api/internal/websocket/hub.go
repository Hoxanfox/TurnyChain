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

const clientSendBufferSize = 64

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
	send   chan []byte
}

type roleBroadcast struct {
	role    string
	message []byte
}

// Hub mantiene el conjunto de clientes activos.
type Hub struct {
	clients         map[*websocket.Conn]*ClientInfo
	broadcast       chan []byte
	broadcastToRole chan roleBroadcast
	Register        chan *ClientInfo
	Unregister      chan *websocket.Conn
}

func NewHub() *Hub {
	return &Hub{
		broadcast:       make(chan []byte),
		broadcastToRole: make(chan roleBroadcast),
		Register:        make(chan *ClientInfo),
		Unregister:      make(chan *websocket.Conn),
		clients:         make(map[*websocket.Conn]*ClientInfo),
	}
}

func (h *Hub) startWriter(client *ClientInfo) {
	for message := range client.send {
		if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("❌ Error al escribir mensaje a cliente %s (role: %s): %v", client.UserID, client.Role, err)
			h.Unregister <- client.Conn
			return
		}
	}
}

func (h *Hub) removeClient(connection *websocket.Conn) {
	clientInfo, ok := h.clients[connection]
	if !ok {
		return
	}

	delete(h.clients, connection)
	close(clientInfo.send)
	if connection != nil {
		_ = connection.Close()
	}

	log.Printf("👋 Cliente WebSocket desconectado. Role: %s, Clientes restantes: %d",
		clientInfo.Role, len(h.clients))
}

// Run inicia el hub en una goroutine.
func (h *Hub) Run() {
	for {
		select {
		case clientInfo := <-h.Register:
			if clientInfo == nil || clientInfo.Conn == nil {
				log.Println("⚠️ Se intentó registrar un cliente WebSocket inválido")
				continue
			}

			clientInfo.send = make(chan []byte, clientSendBufferSize)

			for connection, existing := range h.clients {
				if existing.UserID == clientInfo.UserID && existing.Role == clientInfo.Role {
					log.Printf("♻️ Reemplazando conexión WebSocket previa. Role: %s, UserID: %s", existing.Role, existing.UserID)
					h.removeClient(connection)
				}
			}
			h.clients[clientInfo.Conn] = clientInfo
			go h.startWriter(clientInfo)
			log.Printf("✅ Nuevo cliente WebSocket conectado. Role: %s, UserID: %s, Total clientes: %d",
				clientInfo.Role, clientInfo.UserID, len(h.clients))
		case connection := <-h.Unregister:
			h.removeClient(connection)
		case message := <-h.broadcast:
			for connection, clientInfo := range h.clients {
				select {
				case clientInfo.send <- message:
				default:
					log.Printf("⚠️ Cliente WebSocket lento. Desconectando UserID: %s, Role: %s", clientInfo.UserID, clientInfo.Role)
					h.removeClient(connection)
				}
			}
		case rb := <-h.broadcastToRole:
			sentCount := 0
			for conn, clientInfo := range h.clients {
				if clientInfo.Role == rb.role {
					select {
					case clientInfo.send <- rb.message:
						sentCount++
					default:
						log.Printf("⚠️ Cliente WebSocket lento. Desconectando UserID: %s, Role: %s", clientInfo.UserID, clientInfo.Role)
						h.removeClient(conn)
					}
				}
			}
			log.Printf("📡 BroadcastToRole: Enviando mensaje a %d clientes con rol '%s'", sentCount, rb.role)
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
	log.Printf("📡 Broadcast: Encolando mensaje tipo '%s'", msgType)
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

	log.Printf("📡 BroadcastToRole: Encolando mensaje tipo '%s' para rol '%s'", msgType, role)
	h.broadcastToRole <- roleBroadcast{role: role, message: jsonMessage}
}
