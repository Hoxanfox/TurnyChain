# 🔄 Diagrama de Flujo - Sistema WebSocket Corregido

## 📅 18 de Diciembre de 2024

---

## 🎨 ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SISTEMA WEBSOCKET                              │
│                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐   │
│  │   MESERO     │         │   BACKEND    │         │   CAJERO     │   │
│  │  (Frontend)  │         │   (Go/Fiber) │         │  (Frontend)  │   │
│  │              │         │              │         │              │   │
│  │ Role: mesero │◄───────►│   HUB WS     │◄───────►│ Role:cashier │   │
│  │ UserID: 123  │  WebSocket  │              │  WebSocket  │ UserID: 456  │   │
│  └──────────────┘         └──────────────┘         └──────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 CONEXIÓN WEBSOCKET

### Antes de la Corrección ❌
```
Frontend ──────────► ws://localhost:8080/ws
                     (sin identificación)
                     
Backend:
  - No sabe quién es el cliente
  - No puede filtrar por rol
  - Envía TODO a TODOS
```

### Después de la Corrección ✅
```
Frontend ──────────► ws://localhost:8080/ws?user_id=123&role=mesero
                     (con identificación)
                     
Backend:
  - Sabe quién es cada cliente
  - Puede filtrar por rol
  - Envía mensajes dirigidos
```

---

## 📊 FLUJO 1: PRIMERA SUBIDA DE COMPROBANTE

```
TIEMPO   MESERO                  BACKEND                      CAJERO
═══════════════════════════════════════════════════════════════════════

T+0s    ┌─────────────┐
        │ Sube imagen │
        │ de pago     │
        └─────┬───────┘
              │
              │ POST /orders/:id/proof
              │ { file, method: "transferencia" }
              ▼
T+0.5s                       ┌────────────────────┐
                             │ order_handler.go   │
                             │ UploadPaymentProof │
                             └────────┬───────────┘
                                      │
                                      │ 📤 Log: Recibiendo comprobante
                                      │ 💾 Guarda archivo
                                      ▼
T+1s                         ┌────────────────────┐
                             │ order_service.go   │
                             │ AddPaymentProof    │
                             └────────┬───────────┘
                                      │
                                      │ ✅ Status → "por_verificar"
                                      │ 📡 Broadcast ORDER_UPDATED (todos)
                                      │ 📡 BroadcastToRole(cashier, ...)
                                      ▼
T+1.2s                       ┌────────────────────┐
                             │ websocket/hub.go   │
                             │ BroadcastToRole    │
                             └──────┬─────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
              (Broadcast)                     (Solo cashier)
                   │                               │
                   │                               │
T+1.3s    ┌────────▼──────────┐         ┌────────▼──────────┐
          │ Recibe evento     │         │ 🔔 NOTIFICACIÓN   │
          │ (informativo)     │         │ Nueva orden       │
          │                   │         │ para verificar    │
          └───────────────────┘         └─────────┬─────────┘
                                                   │
                                                   ▼
T+1.4s                                   ┌─────────────────────┐
                                         │ UI se actualiza     │
                                         │ Orden aparece en    │
                                         │ "Por Verificar"     │
                                         │ 🔊 Sonido           │
                                         └─────────────────────┘

═══════════════════════════════════════════════════════════════════════
RESULTADO: Cajero ve la orden INMEDIATAMENTE sin recargar
```

---

## 📊 FLUJO 2: REENVÍO DESPUÉS DE RECHAZO

```
TIEMPO   CAJERO                  BACKEND                      MESERO
═══════════════════════════════════════════════════════════════════════

T+0s    ┌─────────────┐
        │ Rechaza     │
        │ pago        │
        └─────┬───────┘
              │
              │ PUT /orders/:id/status
              │ { status: "entregado" }
              ▼
T+0.5s                       ┌────────────────────┐
                             │ order_service.go   │
                             │ UpdateOrderStatus  │
                             └────────┬───────────┘
                                      │
                                      │ Status → "entregado"
                                      │ 📡 Broadcast ORDER_STATUS_UPDATED
                                      ▼
T+1s                                           ┌─────────────────┐
                                               │ 🔔 Notificación │
                                               │ "Pago           │
                                               │  rechazado"     │
                                               └────────┬────────┘
                                                        │
                                                        ▼
T+5s                                           ┌─────────────────┐
                                               │ Mesero ve       │
                                               │ botón naranja   │
                                               │ "🔄 Reintentar  │
                                               │  Pago"          │
                                               └────────┬────────┘
                                                        │
                                                        │ Click
                                                        ▼
T+10s                                          ┌─────────────────┐
                                               │ Sube nuevo      │
                                               │ comprobante     │
                                               └────────┬────────┘
                                                        │
              ┌─────────────────────────────────────────┘
              │
              │ POST /orders/:id/proof
              │ { file, method: "transferencia" }
              ▼
T+11s                      ┌────────────────────┐
                           │ order_handler.go   │
                           │ UploadPaymentProof │
                           └────────┬───────────┘
                                    │
                                    │ 📤 Log: Reenvío detectado
                                    │ 💾 Guarda nuevo archivo
                                    ▼
T+12s                      ┌────────────────────┐
                           │ order_service.go   │
                           │ AddPaymentProof    │
                           └────────┬───────────┘
                                    │
                                    │ ✅ Status → "por_verificar"
                                    │ 📡 BroadcastToRole(cashier, ...)
                                    │    action: "resubmitted"
                                    ▼
T+12.3s   ┌──────────────────────┐
          │ 🔔 NOTIFICACIÓN      │
          │ Nuevo comprobante    │
          │ recibido             │
          └──────────┬───────────┘
                     │
                     ▼
T+12.5s   ┌──────────────────────┐
          │ UI se actualiza      │
          │ Orden reaparece en   │
          │ "Por Verificar"      │
          │ Badge: "🔄 Reintento"│
          └──────────────────────┘

═══════════════════════════════════════════════════════════════════════
RESULTADO: Cajero ve el reenvío INMEDIATAMENTE sin recargar
```

---

## 🗂️ ESTRUCTURA DEL HUB WEBSOCKET

### Antes ❌
```go
type Hub struct {
    clients   map[*websocket.Conn]bool  // Solo la conexión
    broadcast chan []byte
}

// No puede filtrar por rol
// Envía TODO a TODOS
```

### Después ✅
```go
type Hub struct {
    clients   map[*websocket.Conn]*ClientInfo  // Conexión + Info
    broadcast chan []byte
}

type ClientInfo struct {
    Conn   *websocket.Conn
    UserID string
    Role   string  // "mesero", "cashier", "cocina", "admin"
}

// PUEDE filtrar por rol
// BroadcastToRole("cashier", ...) → Solo cajeros reciben
```

---

## 📡 EVENTOS WEBSOCKET

### Eventos Generales (Broadcast a todos)
```
┌─────────────────────────┐
│ ORDER_UPDATED           │  Cualquier actualización de orden
│ ORDER_STATUS_UPDATED    │  Cambio de estado
│ NEW_PENDING_ORDER       │  Nueva orden creada
│ ORDER_ITEMS_UPDATED     │  Items modificados
└─────────────────────────┘
```

### Eventos Específicos (Solo a roles)
```
┌─────────────────────────────────┐
│ PAYMENT_VERIFICATION_PENDING    │  → Solo "cashier"
│   - Nueva subida de comprobante │
│   - Reenvío de comprobante      │
│                                 │
│ ORDER_READY_FOR_PAYMENT         │  → Solo "cashier"
│   - Orden entregada con pago    │
│   - Lista para cobrar           │
└─────────────────────────────────┘
```

---

## 🎯 PAYLOAD DE EVENTOS

### ORDER_UPDATED (General)
```json
{
  "type": "ORDER_UPDATED",
  "payload": {
    "id": "abc-123-def",
    "status": "por_verificar",
    "table_number": 5,
    "total": 25000,
    "payment_method": "transferencia",
    "payment_proof_path": "/static/proofs/order_abc-123-def_1234567890.jpg",
    "created_at": "2024-12-18T19:00:00Z",
    "updated_at": "2024-12-18T19:30:00Z"
  }
}
```

### PAYMENT_VERIFICATION_PENDING (Solo Cajeros)
```json
{
  "type": "PAYMENT_VERIFICATION_PENDING",
  "payload": {
    "order_id": "abc-123-def",
    "table_number": 5,
    "method": "transferencia",
    "total": 25000,
    "status": "por_verificar",
    "action": "resubmitted",  // ← Indica si es reenvío
    "order": {
      // ... orden completa con items, etc.
    }
  }
}
```

---

## 🔍 DEBUGGING

### Logs a Buscar en Backend

#### Conexión de Cliente
```bash
✅ Nuevo cliente WebSocket conectado. Role: cashier, UserID: 123-456, Total: 3
🔌 Nueva conexión WebSocket establecida. UserID: 123-456, Role: cashier
```

#### Subida de Comprobante
```bash
📤 [Handler] Recibiendo comprobante para orden abc-123
   - Usuario: waiter-id (Role: mesero)
   - Método de pago: transferencia
   - Archivo recibido: proof.jpg (245678 bytes)
💾 [Handler] Archivo guardado en: ./uploads/proofs/...
✅ [Backend] Orden abc-123 actualizada a estado 'por_verificar'
📡 [Backend] Evento broadcast 'ORDER_UPDATED' emitido
📡 BroadcastToRole: Enviando 'PAYMENT_VERIFICATION_PENDING' a 2 cashiers
```

### Logs a Buscar en Frontend (Consola)

#### Conexión
```javascript
🔌 Conectando WebSocket como cashier (123-456)
✅ WebSocket conectado exitosamente
   - Role: cashier
   - UserID: 123-456
```

#### Recepción de Evento
```javascript
📨 Mensaje WebSocket recibido: {type: "PAYMENT_VERIFICATION_PENDING", ...}
🔔 Nueva orden para verificar: {order_id: "abc-123", ...}
```

---

## 🚦 ESTADOS DE ORDEN

```
┌─────────────────┐
│ pendiente       │  Nueva orden creada
│ _aprobacion     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ en_preparacion  │  Cocina trabajando
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ listo           │  Listo para servir
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ entregado       │  Servido al cliente
└────────┬────────┘
         │
         │ Mesero sube comprobante
         ▼
┌─────────────────┐
│ por_verificar   │◄─── ⚠️ AQUÍ SE EMITE EVENTO A CAJEROS
└────────┬────────┘
         │
         ├─ Aprobado ──────► pagado (fin)
         │
         └─ Rechazado ────► entregado (con payment_method)
                            │
                            │ Mesero reenvía
                            ▼
                         por_verificar ◄─── ⚠️ EVENTO A CAJEROS
```

---

## 🎯 VENTAJAS DEL SISTEMA

### Performance
```
Antes:
  - Polling cada 5 segundos
  - 12 requests/minuto por cliente
  - 100 clientes = 1,200 requests/minuto
  - Alta latencia (0-5 segundos)

Después:
  - WebSocket en tiempo real
  - 0 requests de polling
  - 100 clientes = 0 requests extra
  - Baja latencia (<1 segundo)
```

### UX
```
Antes:
  - Esperar hasta 5 segundos
  - Posibles inconsistencias
  - Requiere recargar página

Después:
  - Notificación inmediata
  - Siempre sincronizado
  - Sin recargas necesarias
```

### Recursos
```
Antes:
  - Alto uso de CPU (polling)
  - Alto uso de red
  - Alto uso de DB (queries repetidas)

Después:
  - Bajo uso de CPU (eventos)
  - Bajo uso de red (solo cambios)
  - Bajo uso de DB (queries on-demand)
```

---

## ✅ VERIFICACIÓN FINAL

### Checklist Backend
- [x] Hub con soporte de roles
- [x] BroadcastToRole implementado
- [x] ClientInfo con UserID y Role
- [x] Eventos específicos a cajeros
- [x] Logs detallados
- [x] Compila sin errores

### Checklist Frontend (Pendiente)
- [ ] Conexión con user_id y role
- [ ] Listeners de eventos
- [ ] Notificaciones visuales
- [ ] Testing completo

---

**Diagrama creado el 18 de Diciembre de 2024**

Para más detalles técnicos, ver:
- `WEBSOCKET_FIX_SUMMARY.md`
- `FRONTEND_WEBSOCKET_UPDATE.md`
- `CORRECTION_COMPLETE.md`

