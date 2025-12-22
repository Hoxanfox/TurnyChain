# 🎯 Implementación de Tipos de Orden

## 📋 Resumen
Se implementó un sistema de **tipos de orden** que permite diferenciar entre órdenes para consumo en mesa, para llevar y a domicilio, con lógica inteligente de empaque y validaciones.

---

## 🎨 Tipos de Orden Implementados

### 1. 🍽️ MESA (order_type: "mesa")
- **Descripción:** Consumo en el restaurante
- **Permite items híbridos:** ✅ SÍ
- **Lógica:** Algunos items pueden ser para llevar (🥡), otros para comer ahí (🍽️)
- **Mesa:** Usa el número de mesa real (1, 2, 3, etc.)
- **Validaciones:** Requiere número de mesa válido

**Ejemplo:**
```json
{
  "order_type": "mesa",
  "table_number": 5,
  "items": [
    {"menu_item_id": "...", "quantity": 2, "is_takeout": false},
    {"menu_item_id": "...", "quantity": 1, "is_takeout": true}
  ]
}
```

### 2. 🥡 LLEVAR (order_type: "llevar")
- **Descripción:** Todo empacado para recoger en el local
- **Permite items híbridos:** ❌ NO (todo forzado a empaque)
- **Lógica:** Backend fuerza `is_takeout = true` en TODOS los items
- **Mesa:** Usa mesa virtual 9999
- **Validaciones:** Ninguna adicional

**Ejemplo:**
```json
{
  "order_type": "llevar",
  "items": [
    {"menu_item_id": "...", "quantity": 6, "is_takeout": false}
  ]
}
// Backend automáticamente convierte is_takeout a true
```

### 3. 🏍️ DOMICILIO (order_type: "domicilio")
- **Descripción:** Entrega a domicilio
- **Permite items híbridos:** ❌ NO (todo forzado a empaque)
- **Lógica:** Backend fuerza `is_takeout = true` en TODOS los items
- **Mesa:** Usa mesa virtual 9998
- **Validaciones:** 
  - ✅ `delivery_address` es OBLIGATORIO
  - ✅ `delivery_phone` es OBLIGATORIO
  - ⚪ `delivery_notes` es OPCIONAL

**Ejemplo:**
```json
{
  "order_type": "domicilio",
  "delivery_address": "Calle 123 #45-67, Apto 301",
  "delivery_phone": "3001234567",
  "delivery_notes": "Llamar al llegar, portería cerrada",
  "items": [
    {"menu_item_id": "...", "quantity": 2, "is_takeout": false}
  ]
}
// Backend automáticamente convierte is_takeout a true
```

---

## 🗄️ Cambios en Base de Datos

### Tabla `orders` - Columnas Agregadas:

```sql
-- Tipo de orden
"order_type" VARCHAR(20) NOT NULL DEFAULT 'mesa' 
    CHECK (order_type IN ('mesa', 'llevar', 'domicilio'))

-- Campos para domicilio (opcionales, solo cuando order_type = 'domicilio')
"delivery_address" TEXT NULL
"delivery_phone" VARCHAR(20) NULL
"delivery_notes" TEXT NULL
```

### Tabla `tables` - Mesas Virtuales:

```sql
-- Mesa virtual para órdenes LLEVAR
table_number: 9999
id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b99'

-- Mesa virtual para órdenes DOMICILIO
table_number: 9998
id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b98'
```

---

## 🔧 Cambios en Backend (Go)

### 1. Modelo de Dominio (`domain/order.go`)

```go
type Order struct {
    // ...campos existentes...
    
    // NUEVO: Tipo de orden
    OrderType string `json:"order_type" db:"order_type"`
    
    // NUEVO: Campos para domicilio
    DeliveryAddress *string `json:"delivery_address,omitempty" db:"delivery_address"`
    DeliveryPhone   *string `json:"delivery_phone,omitempty" db:"delivery_phone"`
    DeliveryNotes   *string `json:"delivery_notes,omitempty" db:"delivery_notes"`
}
```

### 2. Servicio (`service/order_service.go`)

**Firma actualizada:**
```go
func CreateOrder(
    waiterID uuid.UUID, 
    tableNumber int, 
    orderType string,                    // NUEVO
    deliveryAddress *string,             // NUEVO
    deliveryPhone *string,               // NUEVO
    deliveryNotes *string,               // NUEVO
    items []domain.OrderItem
) (*domain.Order, error)
```

**Validaciones implementadas:**
```go
// 1. Validar order_type
if orderType != "mesa" && orderType != "llevar" && orderType != "domicilio" {
    return error: "order_type inválido"
}

// 2. Validar campos obligatorios para domicilio
if orderType == "domicilio" {
    if deliveryAddress == nil || *deliveryAddress == "" {
        return error: "delivery_address es obligatorio"
    }
    if deliveryPhone == nil || *deliveryPhone == "" {
        return error: "delivery_phone es obligatorio"
    }
}

// 3. Asignar mesa virtual según tipo
switch orderType {
    case "domicilio": table = GetByNumber(9998)
    case "llevar": table = GetByNumber(9999)
    case "mesa": table = GetByNumber(tableNumber)
}

// 4. Forzar is_takeout según tipo
if orderType == "llevar" || orderType == "domicilio" {
    for each item: item.IsTakeout = true  // FORZAR
}
```

### 3. Repositorio (`repository/order_repository.go`)

**Queries actualizados (10 funciones):**
- ✅ `CreateOrder` - INSERT con order_type y delivery_*
- ✅ `GetOrders` - SELECT con order_type y delivery_*
- ✅ `GetOrderByID` - SELECT con order_type y delivery_*
- ✅ `UpdateOrderStatus` - RETURNING con order_type y delivery_*
- ✅ `ManageOrder` - RETURNING con order_type y delivery_*
- ✅ `AddPaymentProof` - RETURNING con order_type y delivery_*

### 4. Handler (`handler/order_handler.go`)

**Payload actualizado:**
```go
type CreateOrderPayload struct {
    TableNumber     int                `json:"table_number"`
    OrderType       string             `json:"order_type"`        // NUEVO
    DeliveryAddress *string            `json:"delivery_address"`  // NUEVO
    DeliveryPhone   *string            `json:"delivery_phone"`    // NUEVO
    DeliveryNotes   *string            `json:"delivery_notes"`    // NUEVO
    Items           []domain.OrderItem `json:"items"`
}
```

---

## 📡 Contrato API - Ejemplos

### Ejemplo 1: Orden de MESA (híbrida)
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_type": "mesa",
  "table_number": 5,
  "items": [
    {
      "menu_item_id": "m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41",
      "quantity": 2,
      "price_at_order": 50.00,
      "is_takeout": false
    },
    {
      "menu_item_id": "m02e6f2b-2250-4630-8a2e-8a3d2a1f9c42",
      "quantity": 1,
      "price_at_order": 15.00,
      "is_takeout": true
    }
  ]
}
```

**Response:**
```json
{
  "id": "...",
  "order_type": "mesa",
  "table_number": 5,
  "status": "pendiente_aprobacion",
  "total": 115.00,
  "items": [
    {
      "menu_item_name": "Picada de la Casa",
      "quantity": 2,
      "is_takeout": false
    },
    {
      "menu_item_name": "Hamburguesa",
      "quantity": 1,
      "is_takeout": true
    }
  ]
}
```

### Ejemplo 2: Orden para LLEVAR
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_type": "llevar",
  "items": [
    {
      "menu_item_id": "m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41",
      "quantity": 6,
      "price_at_order": 50.00
    }
  ]
}
```

**Response:**
```json
{
  "id": "...",
  "order_type": "llevar",
  "table_number": 9999,
  "status": "pendiente_aprobacion",
  "total": 300.00,
  "items": [
    {
      "menu_item_name": "Picada de la Casa",
      "quantity": 6,
      "is_takeout": true
    }
  ]
}
```

### Ejemplo 3: Orden a DOMICILIO
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_type": "domicilio",
  "delivery_address": "Calle 123 #45-67, Apto 301",
  "delivery_phone": "3001234567",
  "delivery_notes": "Llamar al llegar",
  "items": [
    {
      "menu_item_id": "m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41",
      "quantity": 2,
      "price_at_order": 50.00
    }
  ]
}
```

**Response:**
```json
{
  "id": "...",
  "order_type": "domicilio",
  "table_number": 9998,
  "delivery_address": "Calle 123 #45-67, Apto 301",
  "delivery_phone": "3001234567",
  "delivery_notes": "Llamar al llegar",
  "status": "pendiente_aprobacion",
  "total": 100.00,
  "items": [
    {
      "menu_item_name": "Picada de la Casa",
      "quantity": 2,
      "is_takeout": true
    }
  ]
}
```

---

## 🍳 Vista para Cocina/Comanda

### MESA 5
```
════════════════════════════════
   🍽️ MESA 5 - COMER AQUÍ
════════════════════════════════
2x Picada de la Casa
   🍽️ Servir en plato

1x Hamburguesa
   🥡 PARA LLEVAR
════════════════════════════════
```

### LLEVAR
```
════════════════════════════════
      🥡 PARA LLEVAR
════════════════════════════════
6x Picada de la Casa
   → TODO EMPACAR
════════════════════════════════
```

### DOMICILIO
```
════════════════════════════════
  🏍️ DOMICILIO - URGENTE
════════════════════════════════
📍 Calle 123 #45-67, Apto 301
📞 3001234567
💬 Llamar al llegar

2x Picada de la Casa
   → TODO EMPACAR
════════════════════════════════
```

---

## 🔄 Migración

### Si tienes base de datos existente:
```bash
psql -U usuario -d turnychain < baseDatos/migration_order_types.sql
```

### Si es instalación nueva:
```bash
psql -U usuario -d turnychain < baseDatos/init.sql
```

---

## ✅ Estado de la Implementación

| Componente | Estado |
|-----------|--------|
| Base de Datos | ✅ Actualizada |
| Modelo Go | ✅ Actualizado |
| Servicio | ✅ Actualizado (validaciones implementadas) |
| Repositorio | ✅ Actualizado (10 funciones) |
| Handler | ✅ Actualizado |
| Compilación | ✅ Sin errores |
| Migración SQL | ✅ Script creado |
| Documentación | ✅ Completa |

---

## 📊 Matriz de Comportamiento

| Tipo | table_number | is_takeout editable? | Validaciones | Mesa Virtual |
|------|--------------|----------------------|--------------|--------------|
| **mesa** | Real (1,2,3...) | ✅ SÍ por item | Mesa debe existir | No |
| **llevar** | 9999 (auto) | ❌ NO (forzado true) | Ninguna | Sí |
| **domicilio** | 9998 (auto) | ❌ NO (forzado true) | address + phone | Sí |

---

## 🎯 Ventajas del Diseño

✅ **Tipado explícito:** Cocina sabe inmediatamente el contexto de la orden  
✅ **Híbridos controlados:** Solo MESA permite mezclar, evita errores  
✅ **Validación automática:** Backend fuerza empaque en llevar/domicilio  
✅ **Campos opcionales:** Dirección solo cuando es necesario  
✅ **Sin breaking changes:** table_id sigue siendo NOT NULL (mesas virtuales)  
✅ **Escalable:** Fácil agregar nuevos tipos (ej: "reserva", "buffet")  

---

## 🚀 Próximos Pasos (Frontend)

### UX Recomendada:

1. **Selector de Tipo de Orden (Principal)**
   ```
   [🍽️ Mesa] [🥡 Llevar] [🏍️ Domicilio]
   ```

2. **Si elige "Mesa":**
   - Mostrar selector de número de mesa
   - En carrito: permitir toggle individual 🍽️ ↔ 🥡

3. **Si elige "Llevar":**
   - Ocultar selector de mesa
   - En carrito: todos los items muestran 🥡 (no editable)

4. **Si elige "Domicilio":**
   - Mostrar formulario:
     - 📍 Dirección (obligatorio)
     - 📞 Teléfono (obligatorio)
     - 💬 Notas (opcional)
   - En carrito: todos los items muestran 🥡 (no editable)

---

**Fecha de Implementación:** 2025-12-20  
**Estado:** ✅ Completado y Verificado  
**Compilación:** ✅ Sin Errores

