# 🔍 Guía Rápida: Dónde Buscar en el Backend

## 📅 Fecha: 18 de Diciembre de 2024

---

## 🎯 Objetivo

Encontrar y corregir el endpoint que maneja el **reenvío de comprobantes de pago** para que emita eventos WebSocket.

---

## 📂 Archivos a Buscar

### 1️⃣ Archivo de Rutas de Órdenes

**Posibles nombres:**
- `routes/orders.py`
- `routers/orders.py`
- `api/orders.py`
- `endpoints/orders.py`

**Buscar el endpoint:**
```python
@router.post("/{order_id}/proof")
# O similar:
@router.post("/orders/{order_id}/proof")
@app.post("/api/orders/{order_id}/proof")
```

**Cómo buscar:**
```bash
# En la terminal del backend:
grep -r "def upload_payment_proof" .
grep -r "/proof" . --include="*.py"
grep -r "order_id}/proof" . --include="*.py"
```

---

## 🔧 Qué Buscar en el Código

### Estructura Actual (Probablemente):

```python
@router.post("/{order_id}/proof")
async def upload_payment_proof(
    order_id: str,
    file: UploadFile = File(...),
    method: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
    # ⚠️ FALTA: manager: ConnectionManager = Depends(get_connection_manager)
):
    # 1. Guardar archivo
    file_path = save_file(file)
    
    # 2. Actualizar orden
    order = db.query(Order).filter(Order.id == order_id).first()
    order.payment_method = method
    order.payment_proof_path = file_path
    order.status = "por_verificar"
    
    db.commit()
    db.refresh(order)
    
    # ⚠️ FALTA: Emitir WebSocket aquí
    
    return order
```

---

## ✅ Qué Agregar

### Paso 1: Inyectar ConnectionManager

```python
from app.websocket import manager  # O donde esté definido

@router.post("/{order_id}/proof")
async def upload_payment_proof(
    order_id: str,
    file: UploadFile = File(...),
    method: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    manager: ConnectionManager = Depends(get_connection_manager)  # ⬅️ AGREGAR
):
```

### Paso 2: Emitir Eventos WebSocket

```python
    # ... código existente ...
    
    db.commit()
    db.refresh(order)
    
    # ⬇️ AGREGAR ESTE BLOQUE ⬇️
    
    # Evento general para todos
    await manager.broadcast({
        "type": "order_updated",
        "data": {
            "id": str(order.id),
            "status": order.status,
            "payment_method": order.payment_method,
            "table_number": order.table_number,
            "total": float(order.total)
        }
    })
    
    # Evento específico para cajeros
    await manager.send_to_role("cashier", {
        "type": "payment_verification_pending",
        "data": {
            "order_id": str(order.id),
            "table_number": order.table_number,
            "method": order.payment_method,
            "total": float(order.total),
            "is_resubmit": True  # Indica que es un reenvío
        }
    })
    
    # ⬆️ FIN DEL BLOQUE ⬆️
    
    return order
```

---

## 🔍 Verificar Dependencias

### 2️⃣ Archivo de WebSocket Manager

**Buscar:**
```python
class ConnectionManager:
    async def broadcast(self, message: dict):
        ...
    
    async def send_to_role(self, role: str, message: dict):
        ...
```

**Si NO existe `send_to_role`, agregar:**
```python
async def send_to_role(self, role: str, message: dict):
    """Envía mensaje solo a usuarios con un rol específico"""
    for connection in self.active_connections:
        if connection.user_role == role:  # Ajustar según tu estructura
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error enviando a {role}: {e}")
```

### 3️⃣ Archivo de Dependencias

**Buscar:**
```python
def get_connection_manager():
    return manager  # O la instancia global del manager
```

**Si no existe, crear:**
```python
# En dependencies.py
from app.websocket import manager

def get_connection_manager():
    """Inyecta el ConnectionManager como dependencia"""
    return manager
```

---

## 🧪 Probar la Corrección

### Test Rápido en Consola del Backend:

**Agregar logs temporales:**
```python
import logging
logger = logging.getLogger(__name__)

@router.post("/{order_id}/proof")
async def upload_payment_proof(...):
    logger.info(f"📤 Recibiendo comprobante para orden {order_id}")
    
    # ... código ...
    
    db.commit()
    logger.info(f"✅ Orden actualizada: {order.status}")
    
    await manager.broadcast(...)
    logger.info(f"📡 WebSocket emitido")
    
    return order
```

**Al ejecutar el reenvío de pago, deberías ver:**
```
📤 Recibiendo comprobante para orden abc123
✅ Orden actualizada: por_verificar
📡 WebSocket emitido
```

---

## 📊 Flujo Esperado (Diagrama)

```
Frontend (Mesero)                Backend                    Frontend (Cajero)
      │                             │                              │
      ├─ POST /orders/123/proof ───→│                              │
      │  (file + method)            │                              │
      │                             ├─ Guardar archivo            │
      │                             ├─ Actualizar DB              │
      │                             ├─ order.status = "por_verificar"
      │                             ├─ db.commit()                │
      │                             │                              │
      │                             ├─ await manager.broadcast()  │
      │                             ├─────────────────────────────→│
      │                             │  {type: "order_updated"}    │
      │                             │                              ├─ UI se actualiza
      │                             │                              │   automáticamente
      │                             ├─ await manager.send_to_role()│
      │                             ├─────────────────────────────→│
      │                             │  {type: "payment_verification_pending"}
      │                             │                              ├─ Aparece en
      │                             │                              │   "Por Verificar"
      │ ←─── return order ──────────┤                              │
      │  (status 200)               │                              │
```

---

## ⚠️ Errores Comunes

### Error 1: Manager es None
```python
# Problema:
manager = None  # No está inicializado

# Solución:
from app.websocket import manager  # Importar correctamente
```

### Error 2: Método send_to_role no existe
```python
# Problema:
await manager.send_to_role("cashier", ...)  # Método no definido

# Solución: Usar broadcast si no existe send_to_role
await manager.broadcast(...)  # Envía a todos
```

### Error 3: Commit después de broadcast
```python
# ❌ MAL:
await manager.broadcast(...)
db.commit()  # Los datos aún no están guardados

# ✅ BIEN:
db.commit()
db.refresh(order)
await manager.broadcast(...)  # Ahora sí están guardados
```

---

## 🔍 Checklist de Verificación

Antes de considerar completo:

- [ ] Endpoint encontrado y modificado
- [ ] ConnectionManager inyectado como dependencia
- [ ] `manager.broadcast()` agregado después de commit
- [ ] `manager.send_to_role()` agregado (si existe)
- [ ] Logs de debug agregados
- [ ] Código compilado sin errores
- [ ] Servidor reiniciado
- [ ] Test manual realizado
- [ ] Cajero recibe notificación en tiempo real
- [ ] UI se actualiza sin recargar

---

## 🚀 Después de la Corrección

### Validar con este Test:

**Terminal 1 (Backend):**
```bash
# Deberías ver:
📤 Recibiendo comprobante para orden abc123
✅ Orden actualizada: por_verificar
📡 WebSocket emitido
```

**Navegador 1 (Mesero - Consola):**
```javascript
🔄 [Frontend] Enviando comprobante de pago
✅ [Frontend] Comprobante enviado exitosamente
```

**Navegador 2 (Cajero - Consola):**
```javascript
// Debería recibir:
{
  type: "order_updated",
  data: {
    id: "abc123",
    status: "por_verificar",
    ...
  }
}
```

**Navegador 2 (Cajero - UI):**
```
✅ Orden aparece en "Por Verificar" SIN recargar
✅ Contador se incrementa automáticamente
```

---

## 📝 Notas Importantes

### 1. Ambiente de Desarrollo
Si usas `uvicorn` con reload:
```bash
uvicorn main:app --reload
```
El servidor se reiniciará automáticamente al guardar cambios.

### 2. Ambiente de Producción
Si usas `gunicorn` o similar:
```bash
# Necesitas reiniciar manualmente:
sudo systemctl restart turnychain-backend
```

### 3. Docker
Si usas Docker:
```bash
docker-compose restart backend
```

---

## 🎯 Resultado Esperado

Después de aplicar la corrección:

1. ✅ Mesero reenvía pago
2. ✅ Backend procesa y emite WebSocket
3. ✅ Cajero ve orden aparecer en <1 segundo
4. ✅ No requiere recargar página
5. ✅ Contador se actualiza automáticamente

---

## 📞 Troubleshooting

### Problema: Cajero no recibe notificación

**Solución 1:** Verificar conexión WebSocket
```javascript
// En consola del navegador (Cajero):
// Debería mostrar:
WebSocket connected
```

**Solución 2:** Verificar que backend emite
```python
# Agregar log antes de broadcast:
logger.info(f"Conexiones activas: {len(manager.active_connections)}")
```

**Solución 3:** Verificar que orden cambia de estado
```python
# Verificar en DB:
SELECT id, status, payment_method FROM orders WHERE id = 'abc123';
```

---

## ✅ Confirmación Final

Cuando veas esto, está funcionando:

```
[MESERO]                     [CAJERO]
Clic "Reenviar" ──────→   ⚡ Aparece orden
                           (0.5 segundos)
Sin recargar página    ←──────── Sin recargar página
```

---

**Estado:** 📋 **LISTA DE VERIFICACIÓN COMPLETA**

---

_Guía creada el 18 de Diciembre de 2024_

