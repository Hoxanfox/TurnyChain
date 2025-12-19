# 🔧 Corrección Requerida en el Backend - WebSocket para Reintentos de Pago

## 📅 Fecha: 18 de Diciembre de 2024

---

## 🐛 Problema Identificado

Cuando un mesero reenvía un comprobante de pago después de que fue rechazado, **el cajero NO recibe notificación en tiempo real** a través de WebSocket.

---

## 🔍 Diagnóstico

### Frontend (Ya Corregido) ✅

El frontend ahora:
1. ✅ Muestra órdenes entregadas con pago pendiente en "Por Cobrar"
2. ✅ Contador correcto de órdenes pendientes
3. ✅ Badge visual "🔄 Pago Rechazado" para distinguir reintentos
4. ✅ Envía correctamente el comprobante con logs de debug

### Backend (Requiere Corrección) ❌

El endpoint `POST /orders/{order_id}/proof` probablemente **NO está emitiendo el evento WebSocket** cuando se reenvía un comprobante.

---

## 🔧 Solución Requerida en el Backend

### Archivo a Revisar

Buscar el endpoint que maneja:
```python
@router.post("/{order_id}/proof")
async def upload_payment_proof(order_id: str, ...):
```

### Código que Debe Tener

```python
@router.post("/{order_id}/proof")
async def upload_payment_proof(
    order_id: str,
    file: UploadFile,
    method: str = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    manager: ConnectionManager = Depends(get_connection_manager)  # ⚠️ IMPORTANTE
):
    # ... Lógica de guardado de archivo ...
    
    # Actualizar la orden
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Actualizar campos
    order.payment_method = method
    order.payment_proof_path = saved_file_path
    order.status = "por_verificar"  # ⚠️ IMPORTANTE: Cambiar a por_verificar
    
    db.commit()
    db.refresh(order)
    
    # ⚠️⚠️⚠️ CRÍTICO: EMITIR EVENTO WEBSOCKET ⚠️⚠️⚠️
    # Esto es lo que falta en el backend actual
    await manager.broadcast({
        "type": "order_updated",
        "data": {
            "id": str(order.id),
            "status": order.status,
            "payment_method": order.payment_method,
            "table_number": order.table_number,
            "total": float(order.total),
            "updated_at": order.updated_at.isoformat() if order.updated_at else None
        }
    })
    
    # También notificar específicamente al rol 'cashier'
    await manager.send_to_role("cashier", {
        "type": "payment_verification_pending",
        "data": {
            "order_id": str(order.id),
            "table_number": order.table_number,
            "method": order.payment_method,
            "total": float(order.total),
            "action": "resubmitted"  # ← Indica que es un reenvío
        }
    })
    
    return order
```

---

## 📋 Checklist de Corrección en Backend

### Verificar que el endpoint:

- [ ] **Recibe el ConnectionManager como dependencia**
  ```python
  manager: ConnectionManager = Depends(get_connection_manager)
  ```

- [ ] **Cambia el estado a "por_verificar"**
  ```python
  order.status = "por_verificar"
  ```

- [ ] **Emite evento broadcast general**
  ```python
  await manager.broadcast({"type": "order_updated", ...})
  ```

- [ ] **Emite evento específico para cajeros**
  ```python
  await manager.send_to_role("cashier", {"type": "payment_verification_pending", ...})
  ```

- [ ] **Hace commit ANTES de emitir eventos**
  ```python
  db.commit()
  db.refresh(order)
  # LUEGO emitir eventos
  ```

---

## 🧪 Cómo Probar la Corrección

### Test 1: Primer Envío de Pago

**Paso 1:** Como Mesero
```bash
1. Crear orden y marcarla como entregada
2. Ir a PaymentsSlide
3. Hacer clic en "💳 Cobrar"
4. Seleccionar "Transferencia"
5. Subir foto del comprobante
6. ✅ Verificar en consola del navegador:
   🔄 [Frontend] Enviando comprobante de pago
   ✅ [Frontend] Comprobante enviado exitosamente
```

**Paso 2:** Como Cajero (EN OTRA VENTANA)
```bash
1. Tener CashierDashboard abierto
2. ✅ DEBE aparecer INMEDIATAMENTE la orden en "Por Verificar"
3. ✅ NO debe requerir recargar la página
```

### Test 2: Reenvío de Pago (Después de Rechazo)

**Paso 1:** Como Cajero
```bash
1. Rechazar el pago del Test 1
2. Orden vuelve a "entregado" con payment_method
```

**Paso 2:** Como Mesero
```bash
1. En PaymentsSlide, ver botón "🔄 Reintentar Pago" (naranja)
2. Hacer clic en el botón
3. Subir nueva foto
4. Enviar nuevamente
5. ✅ Verificar logs en consola
```

**Paso 3:** Como Cajero (EN OTRA VENTANA)
```bash
1. ✅ DEBE aparecer INMEDIATAMENTE la orden de nuevo en "Por Verificar"
2. ✅ DEBE mostrar que es un reenvío
3. ✅ NO debe requerir recargar la página
```

---

## 🔍 Logs para Debug

### En el Backend (agregar estos logs):

```python
@router.post("/{order_id}/proof")
async def upload_payment_proof(...):
    logger.info(f"📤 [Backend] Recibiendo comprobante para orden {order_id}")
    logger.info(f"   - Método: {method}")
    logger.info(f"   - Usuario: {current_user['username']}")
    
    # ... Procesar archivo ...
    
    order.status = "por_verificar"
    db.commit()
    db.refresh(order)
    
    logger.info(f"✅ [Backend] Orden {order_id} actualizada a por_verificar")
    
    # Emitir WebSocket
    await manager.broadcast(...)
    logger.info(f"📡 [Backend] Evento WebSocket emitido para orden {order_id}")
    
    await manager.send_to_role("cashier", ...)
    logger.info(f"📡 [Backend] Notificación enviada a cajeros")
    
    return order
```

### En el Frontend (ya agregado):

```typescript
// En ordersAPI.ts
console.log('🔄 [Frontend] Enviando comprobante de pago:', {...});
console.log('✅ [Frontend] Comprobante enviado exitosamente:', {...});
```

---

## 🎯 Resultado Esperado

### Después de la Corrección:

1. **Mesero envía comprobante** → Backend recibe
2. **Backend actualiza orden** → Status = "por_verificar"
3. **Backend emite WebSocket** → Evento broadcast
4. **Cajero recibe notificación** → Orden aparece en tiempo real
5. **Cajero ve orden** → Sin necesidad de recargar

### Timeline Esperado:
```
T+0s    → Mesero hace clic en "Enviar Comprobante"
T+0.5s  → Backend procesa y guarda archivo
T+0.6s  → Backend emite evento WebSocket
T+0.7s  → Cajero recibe notificación
T+0.8s  → UI del cajero se actualiza automáticamente
```

---

## 📝 Archivos Backend a Revisar

Buscar en el backend:

1. **Archivo de rutas de órdenes**
   - Probablemente: `routes/orders.py` o `routers/orders.py`
   - Buscar: `@router.post("/{order_id}/proof")`

2. **Archivo de WebSocket Manager**
   - Probablemente: `websocket.py` o `websocket_manager.py`
   - Verificar que tenga método `send_to_role()`

3. **Archivo de dependencias**
   - Probablemente: `dependencies.py`
   - Verificar `get_connection_manager()`

---

## ⚠️ Errores Comunes en Backend

### Error 1: Manager no inyectado
```python
# ❌ MAL
@router.post("/{order_id}/proof")
async def upload_payment_proof(...):
    # No tiene manager

# ✅ BIEN
@router.post("/{order_id}/proof")
async def upload_payment_proof(
    manager: ConnectionManager = Depends(get_connection_manager)
):
```

### Error 2: No hacer commit antes de broadcast
```python
# ❌ MAL
await manager.broadcast(...)  # Primero broadcast
db.commit()  # Después commit

# ✅ BIEN
db.commit()  # Primero commit
db.refresh(order)
await manager.broadcast(...)  # Después broadcast
```

### Error 3: No cambiar status
```python
# ❌ MAL
order.payment_method = method
# Falta: order.status = "por_verificar"

# ✅ BIEN
order.payment_method = method
order.status = "por_verificar"
```

---

## 🔄 Estados de Orden (Referencia)

```
Flujo Normal:
pendiente → en_preparacion → listo → entregado → por_verificar → pagado

Flujo con Rechazo:
entregado → por_verificar → [RECHAZADO] → entregado (con payment_method)
                                              ↓
                                         [REENVÍO]
                                              ↓
                                         por_verificar → pagado
```

---

## 📊 Comparación Antes/Después

### ANTES (Con Bug):
```
MESERO                    BACKEND                  CAJERO
  │                          │                       │
  ├─ Reenvía pago ──────────→│                       │
  │                          ├─ Guarda archivo      │
  │                          ├─ Actualiza DB        │
  │                          ├─ ❌ NO emite WS      │
  │                          │                       │
  │                          │                       │ (no recibe nada)
  │                          │                       ├─ Debe recargar página
  │                          │                       │   manualmente
```

### DESPUÉS (Corregido):
```
MESERO                    BACKEND                  CAJERO
  │                          │                       │
  ├─ Reenvía pago ──────────→│                       │
  │                          ├─ Guarda archivo      │
  │                          ├─ Actualiza DB        │
  │                          ├─ ✅ Emite WS ────────→│
  │                          │                       ├─ Recibe notificación
  │                          │                       ├─ UI se actualiza
  │                          │                       │   AUTOMÁTICAMENTE
```

---

## ✅ Validación Final

Después de corregir el backend, verificar:

1. [ ] Logs del backend muestran emisión de WebSocket
2. [ ] Consola del navegador (cajero) muestra recepción de evento
3. [ ] UI del cajero se actualiza sin recargar
4. [ ] Contador de "Por Verificar" se incrementa automáticamente
5. [ ] Orden aparece en la lista sin delay

---

## 🚀 Siguientes Pasos

1. **Localizar el archivo del backend** con el endpoint de proof
2. **Agregar inyección de ConnectionManager**
3. **Agregar emisión de eventos WebSocket**
4. **Agregar logs para debug**
5. **Probar el flujo completo**
6. **Validar con mesero y cajero en tiempo real**

---

## 📞 Contacto para Dudas

Si después de aplicar estos cambios el problema persiste:
1. Revisar logs del backend
2. Revisar logs del frontend (consola del navegador)
3. Verificar que el WebSocket esté conectado (NetworkTab)

---

**Estado:** 📝 **DOCUMENTACIÓN COMPLETA - LISTO PARA APLICAR EN BACKEND**

---

_Documentación creada el 18 de Diciembre de 2024_

