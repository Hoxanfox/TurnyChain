# Edición Granular de Órdenes - Guía de Uso

## 📋 Descripción

Nuevo endpoint que permite **editar órdenes de forma granular** sin necesidad de reenviar toda la orden. Ideal para el caso de uso donde un mesero necesita corregir una orden rechazada.

## 🎯 Características

- ✅ **Agregar items nuevos** sin reenviar los existentes
- ✅ **Modificar items específicos** (cantidad, notas, customizaciones, is_takeout)
- ✅ **Eliminar items** por índice
- ✅ **Cambiar metadatos** de la orden (tipo, mesa, dirección de entrega, etc.)
- ✅ **Validaciones de estado** (solo editable en `pendiente_aprobacion` o `rechazado`)
- ✅ **Recálculo automático** del total
- ✅ **Notificaciones WebSocket** automáticas

---

## 🔗 Endpoint

```http
PATCH /api/orders/:id/edit
Authorization: Bearer <token>
Content-Type: application/json
```

### Estados Editables

- ✅ `pendiente_aprobacion` - Orden pendiente de aprobación
- ✅ `rechazado` - Orden rechazada que necesita corrección

Al editar una orden en estado `rechazado`, **automáticamente** cambia a `pendiente_aprobacion`.

---

## 📦 Estructura del Payload

```typescript
{
  // OPERACIONES SOBRE ITEMS
  "add_items"?: OrderItem[],      // Items nuevos a agregar
  "update_items"?: UpdateItemOp[], // Items a modificar (por índice)
  "remove_items"?: number[],       // Índices de items a eliminar (0-based)
  
  // MODIFICACIONES A NIVEL DE ORDEN
  "order_type"?: "mesa" | "llevar" | "domicilio",
  "delivery_address"?: string,     // Cambiar dirección de entrega
  "delivery_phone"?: string,       // Cambiar teléfono de entrega
  "delivery_notes"?: string,       // Cambiar notas de entrega
  "table_number"?: number          // Cambiar mesa (solo para order_type="mesa")
}
```

### UpdateItemOp

```typescript
{
  "index": number,                    // Índice del item en el array (0-based)
  "quantity"?: number,                // Nueva cantidad
  "notes"?: string,                   // Nuevas notas
  "customizations_input"?: {          // Nuevas customizaciones
    "removed_ingredient_ids": string[],
    "unselected_accompaniment_ids": string[]
  },
  "is_takeout"?: boolean             // Cambiar si es para llevar
}
```

---

## 📝 Ejemplos de Uso

### 1. Agregar un Item Nuevo

**Caso:** El cliente olvidó pedir una bebida

```json
{
  "add_items": [
    {
      "menu_item_id": "550e8400-e29b-41d4-a716-446655440001",
      "quantity": 2,
      "price_at_order": 15.00,
      "notes": "Sin hielo",
      "is_takeout": false
    }
  ]
}
```

### 2. Modificar Cantidad de un Item

**Caso:** El cliente quiere 3 tacos en lugar de 2

```json
{
  "update_items": [
    {
      "index": 0,
      "quantity": 3
    }
  ]
}
```

### 3. Cambiar Customizaciones de un Item

**Caso:** El cliente quiere quitar cebolla del segundo plato

```json
{
  "update_items": [
    {
      "index": 1,
      "customizations_input": {
        "removed_ingredient_ids": ["550e8400-e29b-41d4-a716-446655440010"],
        "unselected_accompaniment_ids": []
      }
    }
  ]
}
```

### 4. Eliminar un Item

**Caso:** El cliente ya no quiere el tercer plato

```json
{
  "remove_items": [2]
}
```

### 5. Operaciones Múltiples

**Caso:** Agregar un plato, modificar la cantidad de otro y eliminar uno

```json
{
  "add_items": [
    {
      "menu_item_id": "550e8400-e29b-41d4-a716-446655440020",
      "quantity": 1,
      "price_at_order": 45.00,
      "is_takeout": false
    }
  ],
  "update_items": [
    {
      "index": 0,
      "quantity": 3,
      "notes": "Extra picante"
    }
  ],
  "remove_items": [1]
}
```

### 6. Cambiar de Mesa a Llevar

**Caso:** El cliente decidió que quiere llevar la orden

```json
{
  "order_type": "llevar"
}
```

**Nota:** Al cambiar a `"llevar"` o `"domicilio"`, **todos los items** se marcarán automáticamente como `is_takeout: true`.

### 7. Cambiar a Domicilio

**Caso:** El cliente quiere que le entreguen a domicilio

```json
{
  "order_type": "domicilio",
  "delivery_address": "Calle Principal #123, Col. Centro",
  "delivery_phone": "+52 555 123 4567",
  "delivery_notes": "Casa azul, tocar el timbre"
}
```

### 8. Corrección Completa de Orden Rechazada

**Caso:** Una orden fue rechazada porque tenía items incorrectos y dirección mal escrita

```json
{
  "remove_items": [2],
  "update_items": [
    {
      "index": 0,
      "quantity": 2
    }
  ],
  "add_items": [
    {
      "menu_item_id": "550e8400-e29b-41d4-a716-446655440030",
      "quantity": 1,
      "price_at_order": 35.00,
      "notes": "Sin chile",
      "is_takeout": true
    }
  ],
  "delivery_address": "Av. Reforma #456, Col. Juárez, Piso 3",
  "delivery_phone": "+52 555 987 6543"
}
```

---

## 🔄 Flujo de Trabajo Típico

### Escenario: Orden Rechazada que Necesita Corrección

1. **Mesero crea orden** → Estado: `pendiente_aprobacion`
   ```http
   POST /api/orders
   ```

2. **Admin/Cajero rechaza la orden** → Estado: `rechazado`
   ```http
   PUT /api/orders/:id/status
   {"status": "rechazado"}
   ```

3. **Mesero corrige la orden** → Estado: `pendiente_aprobacion` (automático)
   ```http
   PATCH /api/orders/:id/edit
   {
     "update_items": [{"index": 0, "quantity": 3}],
     "delivery_address": "Dirección corregida"
   }
   ```

4. **Admin/Cajero aprueba** → Estado: `aprobado`
   ```http
   PUT /api/orders/:id/status
   {"status": "aprobado"}
   ```

---

## ⚠️ Validaciones y Restricciones

### Estados Editables

```plaintext
❌ aprobado          → No editable
❌ en_preparacion    → No editable
❌ listo             → No editable
❌ entregado         → No editable
❌ por_verificar     → No editable
❌ pagado            → No editable
✅ pendiente_aprobacion → Editable
✅ rechazado         → Editable
```

### Validaciones de Items

- ❌ No se puede dejar la orden sin items
- ❌ La cantidad debe ser mayor a 0
- ❌ El price_at_order debe ser mayor a 0
- ❌ Los índices deben estar en rango válido

### Validaciones de Metadatos

- ❌ `order_type` solo acepta: `"mesa"`, `"llevar"`, `"domicilio"`
- ❌ Si `order_type = "domicilio"`, `delivery_address` y `delivery_phone` son **obligatorios**
- ❌ El `table_number` debe existir y estar activa

### Orden de Operaciones

Las operaciones se aplican en este orden:

1. **ELIMINAR** items (de mayor a menor índice)
2. **ACTUALIZAR** items existentes
3. **AGREGAR** items nuevos
4. **MODIFICAR** metadatos de la orden
5. **RECALCULAR** total
6. **GUARDAR** en base de datos

---

## 📡 Eventos WebSocket

### `ORDER_EDITED`

Emitido cuando una orden es editada exitosamente.

```json
{
  "type": "ORDER_EDITED",
  "data": {
    "id": "orden-id",
    "status": "pendiente_aprobacion",
    "items": [...],
    "total": 150.00,
    ...
  }
}
```

### `ORDER_RESUBMITTED`

Emitido cuando una orden `rechazada` es corregida y pasa a `pendiente_aprobacion`.

```json
{
  "type": "ORDER_RESUBMITTED",
  "data": {
    "id": "orden-id",
    "status": "pendiente_aprobacion",
    "items": [...],
    ...
  }
}
```

---

## 🔐 Permisos

Solo pueden editar una orden:
- ✅ El mesero que creó la orden
- ✅ Usuarios con rol `admin`

---

## 💡 Ventajas vs `PUT /orders/:id/items`

| Característica | `PUT /items` (Viejo) | `PATCH /edit` (Nuevo) |
|---------------|---------------------|---------------------|
| Agregar 1 item | ❌ Reenviar todos | ✅ Solo el nuevo |
| Modificar 1 item | ❌ Reenviar todos | ✅ Solo el modificado |
| Eliminar 1 item | ❌ Reenviar todos | ✅ Solo el índice |
| Cambiar metadatos | ❌ Endpoint separado | ✅ Mismo endpoint |
| Validación de estado | ❌ No valida | ✅ Valida automáticamente |
| Cantidad de datos | ❌ Alta | ✅ Mínima |
| Complejidad frontend | ❌ Alta | ✅ Baja |

---

## 🧪 Ejemplos de Peticiones cURL

### Agregar un item

```bash
curl -X PATCH "https://api.turnychain.com/api/orders/550e8400-e29b-41d4-a716-446655440000/edit" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "add_items": [{
      "menu_item_id": "550e8400-e29b-41d4-a716-446655440001",
      "quantity": 1,
      "price_at_order": 25.00,
      "is_takeout": false
    }]
  }'
```

### Modificar cantidad

```bash
curl -X PATCH "https://api.turnychain.com/api/orders/550e8400-e29b-41d4-a716-446655440000/edit" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "update_items": [{
      "index": 0,
      "quantity": 3
    }]
  }'
```

### Eliminar item

```bash
curl -X PATCH "https://api.turnychain.com/api/orders/550e8400-e29b-41d4-a716-446655440000/edit" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remove_items": [1]
  }'
```

---

## 🚨 Manejo de Errores

### Orden no encontrada

```json
{
  "error": "orden no encontrada"
}
```
**Status:** `400 Bad Request`

### Estado no editable

```json
{
  "error": "la orden solo puede editarse cuando está en estado 'pendiente_aprobacion' o 'rechazado'. Estado actual: aprobado"
}
```
**Status:** `400 Bad Request`

### Índice fuera de rango

```json
{
  "error": "índice de item a actualizar fuera de rango"
}
```
**Status:** `400 Bad Request`

### Orden sin items

```json
{
  "error": "la orden debe tener al menos un item"
}
```
**Status:** `400 Bad Request`

### Cantidad inválida

```json
{
  "error": "la cantidad debe ser mayor a 0"
}
```
**Status:** `400 Bad Request`

---

## 📊 Comparación con Endpoint Anterior

### Antes: `PUT /orders/:id/items`

```json
// Para agregar 1 item, debes enviar TODA la orden
{
  "items": [
    // Item 1 (existente)
    {
      "menu_item_id": "...",
      "quantity": 2,
      "price_at_order": 50.00,
      ...
    },
    // Item 2 (existente)
    {
      "menu_item_id": "...",
      "quantity": 1,
      "price_at_order": 30.00,
      ...
    },
    // Item 3 (NUEVO) ← Solo este cambió
    {
      "menu_item_id": "...",
      "quantity": 1,
      "price_at_order": 20.00,
      ...
    }
  ]
}
```

### Ahora: `PATCH /orders/:id/edit`

```json
// Solo envías el nuevo item
{
  "add_items": [
    {
      "menu_item_id": "...",
      "quantity": 1,
      "price_at_order": 20.00,
      ...
    }
  ]
}
```

---

## 🎯 Casos de Uso Reales

### 1. Cliente cambia de opinión en mesa

```javascript
// Cliente: "Mejor que sean 3 tacos en lugar de 2"
await fetch(`/api/orders/${orderId}/edit`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    update_items: [{
      index: 0,  // Primer item de la orden
      quantity: 3
    }]
  })
});
```

### 2. Cliente agrega bebida después

```javascript
// Cliente: "Olvidé pedir una coca cola"
await fetch(`/api/orders/${orderId}/edit`, {
  method: 'PATCH',
  body: JSON.stringify({
    add_items: [{
      menu_item_id: cocaColaId,
      quantity: 1,
      price_at_order: 15.00,
      is_takeout: false
    }]
  })
});
```

### 3. Orden rechazada por dirección incorrecta

```javascript
// Admin rechazó porque la dirección estaba incompleta
// Mesero corrige:
await fetch(`/api/orders/${orderId}/edit`, {
  method: 'PATCH',
  body: JSON.stringify({
    delivery_address: "Calle Completa #123, Col. Centro, CP 12345",
    delivery_phone: "+52 555 123 4567"
  })
});
// La orden automáticamente vuelve a 'pendiente_aprobacion'
```

---

_Documentación generada el 16 de febrero de 2026_  
_TurnyChain API - Sistema de Edición Granular de Órdenes_
