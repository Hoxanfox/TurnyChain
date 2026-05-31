// =================================================================
// BACKEND: ARCHIVO 2: /internal/handler/websocket_handler.go (CORREGIDO)
// Propósito: Manejar las nuevas conexiones WebSocket.
// =================================================================
package handler

import (
	"log"
	"strings"
	"time"

	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/repository"
	"github.com/Hoxanfox/TurnyChain/Backend/api/internal/service"
	wshub "github.com/Hoxanfox/TurnyChain/Backend/api/internal/websocket"
	"github.com/gofiber/contrib/websocket"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

type WebSocketHandler struct {
	hub         *wshub.Hub
	sessionRepo repository.SessionRepository
}

func NewWebSocketHandler(h *wshub.Hub, sessionRepo repository.SessionRepository) *WebSocketHandler {
	return &WebSocketHandler{hub: h, sessionRepo: sessionRepo}
}

func (h *WebSocketHandler) HandleConnection(c *websocket.Conn) {
	// Validar token y sesion antes de registrar el WebSocket.
	tokenRaw := strings.TrimSpace(c.Query("token", ""))
	if tokenRaw == "" {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "missing token"))
		_ = c.Close()
		return
	}

	token, err := jwt.Parse(tokenRaw, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, websocket.ErrBadHandshake
		}
		return service.JWT_SECRET_KEY, nil
	})
	if err != nil || !token.Valid {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid token"))
		_ = c.Close()
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid claims"))
		_ = c.Close()
		return
	}

	userIDRaw, ok := claims["sub"].(string)
	if !ok || userIDRaw == "" {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid user"))
		_ = c.Close()
		return
	}
	roleRaw, ok := claims["role"].(string)
	if !ok || roleRaw == "" {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid role"))
		_ = c.Close()
		return
	}
	sessionIDRaw, ok := claims["sid"].(string)
	if !ok || sessionIDRaw == "" {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid session"))
		_ = c.Close()
		return
	}

	userIDParsed, err := uuid.Parse(userIDRaw)
	if err != nil {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid user"))
		_ = c.Close()
		return
	}
	sessionIDParsed, err := uuid.Parse(sessionIDRaw)
	if err != nil {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "invalid session"))
		_ = c.Close()
		return
	}

	active, err := h.sessionRepo.IsSessionActive(sessionIDParsed, userIDParsed, time.Now().UTC())
	if err != nil || !active {
		_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "session revoked"))
		_ = c.Close()
		return
	}

	userID := userIDParsed.String()
	role := roleRaw

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

		active, err := h.sessionRepo.IsSessionActive(sessionIDParsed, userIDParsed, time.Now().UTC())
		if err != nil || !active {
			log.Printf("⚠️ Sesion WebSocket revocada (UserID: %s, Role: %s)", userID, role)
			_ = c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "session revoked"))
			break
		}
	}
}
