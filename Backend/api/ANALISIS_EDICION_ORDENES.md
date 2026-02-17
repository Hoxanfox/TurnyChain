# Análisis: Edición de Comandas/Órdenes en TurnyChain Backend

## Resumen Ejecutivo

El backend de TurnyChain **SÍ soporta la edición de órdenes**, pero con **limitaciones importantes**:
- ✅ Se puede **actualizar la orden completa** (todos los items de una vez)
- ❌ **NO** se puede editar un item individual de forma aislada
- ❌ **NO** se puede editar sub-items o customizaciones de forma independiente
- ✅ Se puede modificar el estado de la orden
- ✅ Se puede reasignar mesero (solo admin)

---

## 1. Endpoints Disponibles para Edición

### 1.1. `PUT /api/orders/:id/items` - Actualizar Items de la Orden

**Handler:** `UpdateOrderItems` en [order_handler.go](Backend/api/internal/handler/order_handler.go#L105-L120)

**Payload:**
```json
{
  "items": [
    {
      "menu_item_id": "uuid",
      "quantity": 2,
      "price_at_order": 25.50,
      "notes": "Sin cebolla",
      "customizations": {
        "active_ingredients": [...],
        "selected_accompaniments": [...]
      },
      "is_takeout": false
    }
  ]
}
```

**Comportamiento:**
- ❌ **Reemplaza TODOS los items** de la orden (no edición selectiva)
- ✅ Recalcula el total automáticamente
- ✅ Ejecuta en transacción SQL (DELETE + INSERT de todos los items)
- ✅ Emite evento WebSocket: `ORDER_ITEMS_UPDATED`
- ⚠️ **No valida que la orden esté en estado editable**

**Código clave:**
```go
func (r *orderRepository) UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem, newTotal float64) error {
    tx, err := r.db.Begin()
    
    // 1. BORRA TODOS LOS ITEMS EXISTENTES
    _, err = tx.Exec("DELETE FROM order_items WHERE order_id = $1", orderID)
    
    // 2. INSERTA TODOS LOS NUEVOS ITEMS
    itemQuery := `INSERT INTO order_items (...) VALUES (...)`
    for _, item := range items {
        _, err := tx.Exec(itemQuery, orderID, item.MenuItemID, ...)
    }
    
    // 3. ACTUALIZA EL TOTAL
    _, err = tx.Exec("UPDATE orders SET total = $1 WHERE id = $2", newTotal, orderID)
    
    return tx.Commit()
}
```

---

### 1.2. `PUT /api/orders/:id/status` - Actualizar Estado

**Handler:** `UpdateOrderStatus` en [order_handler.go](Backend/api/internal/handler/order_handler.go#L78-L93)

**Payload:**
```json
{
  "status": "aprobado"
}
```

**Estados válidos:** 
- `pendiente_aprobacion`
- `aprobado`
- `en_preparacion`
- `listo`
- `entregado`
- `por_verificar`
- `pagado`
- `rechazado`

**Comportamiento:**
- ✅ Solo cambia el estado
- ✅ NO modifica items ni total
- ✅ Incrementa contador de popularidad al aprobar
- ✅ Notariza en blockchain al marcar como "pagado"
- ✅ Emite eventos WebSocket específicos por rol

---

### 1.3. `PUT /api/orders/:id/manage` - Gestión Administrativa

**Handler:** `ManageOrder` en [order_handler.go](Backend/api/internal/handler/order_handler.go#L122-L140)

**Payload:**
```json
{
  "status": "aprobado",
  "waiter_id": "uuid-del-nuevo-mesero"
}
```

**Comportamiento:**
- ✅ Permite cambiar estado Y/O reasignar mesero
- ✅ Solo para administradores
- ✅ NO modifica items ni total
- ✅ Emite evento WebSocket: `ORDER_MANAGED`

---

## 2. Estructura de Datos

### 2.1. Orden (`Order`)

```go
type Order struct {
    ID              uuid.UUID
    WaiterID        uuid.UUID
    TableID         uuid.UUID
    TableNumber     int
    Status          string
    Total           float64
    Items           []OrderItem  // ⚠️ Lista completa
    OrderType       string       // "mesa" | "llevar" | "domicilio"
    DeliveryAddress *string
    PaymentMethod   *string
    PaymentProofPath *string
    // ...
}
```

### 2.2. Item de Orden (`OrderItem`)

```go
type OrderItem struct {
    MenuItemID          uuid.UUID
    MenuItemName        string
    Quantity            int              // ✅ Editable vía UpdateOrderItems
    PriceAtOrder        float64          // ✅ Editable vía UpdateOrderItems
    Notes               *string          // ✅ Editable vía UpdateOrderItems
    Customizations      Customizations   // ✅ Editable vía UpdateOrderItems
    IsTakeout           bool             // ✅ Editable vía UpdateOrderItems
    // Campos de solo lectura (JOIN):
    CategoryID          *uuid.UUID
    CategoryStationID   *uuid.UUID
}
```

### 2.3. Customizaciones (`Customizations`)

```go
type Customizations struct {
    ActiveIngredients      []Ingredient      // ✅ Ingredientes que SÍ lleva
    SelectedAccompaniments []Accompaniment   // ✅ Acompañamientos que SÍ lleva
}

type CustomizationsInput struct {
    RemovedIngredientIDs       []uuid.UUID   // ❌ Lo que NO quiere
    UnselectedAccompanimentIDs []uuid.UUID   // ❌ Lo que NO quiere
}
```

**Flujo:**
1. Frontend envía `CustomizationsInput` (IDs de lo que NO quiere)
2. Backend consulta todos los ingredientes/acompañantes del plato
3. Backend filtra y almacena solo lo que SÍ lleva en `Customizations`

---

## 3. Limitaciones Actuales

### ❌ NO se puede:

1. **Editar un solo item de la orden**
   - Debes enviar TODOS los items, incluso los que no cambiaron
   - Ejemplo: Si la orden tiene 5 items y quieres cambiar la cantidad de 1, debes enviar los 5

2. **Editar solo las customizaciones de un item**
   - No hay endpoint específico
   - Debes actualizar el item completo (vía UpdateOrderItems)

3. **Editar cantidad, precio o notas de forma individual**
   - Impacta en usabilidad del frontend
   - Requiere mantener estado completo de la orden

4. **Validación de estado editable**
   - No hay validación que impida editar una orden "entregada" o "pagada"
   - Podría causar inconsistencias

5. **Agregar un item nuevo sin reenviar todo**
   - Debes obtener la orden, agregar el item en frontend, y reenviar todo

6. **Eliminar un item específico**
   - Debes filtrar en frontend y reenviar los restantes

---

## 4. Comparación de Enfoques

### 4.1. Enfoque Actual (Reemplazo Total)

**Ventajas:**
- ✅ Implementación simple
- ✅ Transacción atómica (todo o nada)
- ✅ Consistencia garantizada

**Desventajas:**
- ❌ Sobrecarga de datos en red
- ❌ Frontend complejo (debe manejar lista completa)
- ❌ No escala bien con órdenes grandes
- ❌ Dificulta auditoría de cambios individuales

### 4.2. Enfoque Granular (Recomendado)

**Endpoints que deberían existir:**

```http
# Agregar un item nuevo
POST /api/orders/:id/items
{
  "menu_item_id": "uuid",
  "quantity": 2,
  ...
}

# Editar un item específico
PUT /api/orders/:id/items/:item_index
{
  "quantity": 3,
  "notes": "Extra picante"
}

# Eliminar un item específico
DELETE /api/orders/:id/items/:item_index

# Actualizar solo customizaciones
PATCH /api/orders/:id/items/:item_index/customizations
{
  "removed_ingredient_ids": ["uuid1", "uuid2"]
}
```

**Ventajas:**
- ✅ Operaciones atómicas y específicas
- ✅ Menos tráfico de red
- ✅ Frontend más simple
- ✅ Mejor auditoría
- ✅ Menor riesgo de conflictos

**Desventajas:**
- ❌ Mayor complejidad en backend
- ❌ Necesita validaciones más estrictas
- ❌ Requiere índice en items (actualmente no existe)

---

## 5. Casos de Uso y Comportamiento

### 5.1. Cliente quiere agregar un plato más

**Actualmente:**
```javascript
// 1. Obtener orden completa
const order = await fetch(`/api/orders/${orderId}`);

// 2. Agregar nuevo item en frontend
const updatedItems = [...order.items, newItem];

// 3. Reenviar TODA la lista
await fetch(`/api/orders/${orderId}/items`, {
  method: 'PUT',
  body: JSON.stringify({ items: updatedItems })
});
```

**Idealmente:**
```javascript
// Agregar directamente sin conocer el estado actual
await fetch(`/api/orders/${orderId}/items`, {
  method: 'POST',
  body: JSON.stringify(newItem)
});
```

### 5.2. Cliente quiere quitar cebolla de un plato

**Actualmente:**
```javascript
// 1. Obtener orden
const order = await fetch(`/api/orders/${orderId}`);

// 2. Modificar customizaciones del item específico
const updatedItems = order.items.map((item, index) => {
  if (index === targetIndex) {
    return {
      ...item,
      customizations_input: {
        removed_ingredient_ids: [..., onionId]
      }
    };
  }
  return item;
});

// 3. Reenviar TODO
await fetch(`/api/orders/${orderId}/items`, {
  method: 'PUT',
  body: JSON.stringify({ items: updatedItems })
});
```

**Idealmente:**
```javascript
await fetch(`/api/orders/${orderId}/items/${itemIndex}/customizations`, {
  method: 'PATCH',
  body: JSON.stringify({
    removed_ingredient_ids: [onionId]
  })
});
```

---

## 6. Validaciones Faltantes

El método `UpdateOrderItems` **NO valida** lo siguiente:

1. ❌ **Estado de la orden**
   - Permite editar órdenes "entregadas", "pagadas" o "rechazadas"
   - Riesgo de inconsistencias con blockchain

2. ❌ **Permisos por rol**
   - No verifica si el usuario tiene permiso para editar
   - Cualquier usuario autenticado podría editar cualquier orden

3. ❌ **Items vacíos**
   - Permite enviar `items: []`, dejando la orden sin items pero con total > 0

4. ❌ **Existencia de menu_items**
   - No valida que los `menu_item_id` existan en la base de datos

5. ❌ **Precios negativos o cero**
   - Permite `price_at_order: 0` o valores negativos

6. ❌ **Cantidades inválidas**
   - Permite `quantity: 0` o negativas

---

## 7. Recomendaciones

### 7.1. Corto Plazo (Mejoras Inmediatas)

1. **Agregar validaciones a `UpdateOrderItems`:**
   ```go
   func (s *orderService) UpdateOrderItems(orderID uuid.UUID, items []domain.OrderItem) (*domain.Order, error) {
       // 1. Obtener orden actual
       order, err := s.orderRepo.GetOrderByID(orderID)
       
       // 2. Validar estado editable
       editableStates := []string{"pendiente_aprobacion", "aprobado"}
       if !contains(editableStates, order.Status) {
           return nil, errors.New("orden no editable en estado: " + order.Status)
       }
       
       // 3. Validar items no vacíos
       if len(items) == 0 {
           return nil, errors.New("la orden debe tener al menos un item")
       }
       
       // 4. Validar cada item
       for _, item := range items {
           if item.Quantity <= 0 {
               return nil, errors.New("cantidad debe ser mayor a 0")
           }
           if item.PriceAtOrder <= 0 {
               return nil, errors.New("precio debe ser mayor a 0")
           }
           // Validar que menu_item existe
           _, err := s.menuRepo.GetByID(item.MenuItemID)
           if err != nil {
               return nil, errors.New("menu_item no encontrado: " + item.MenuItemID.String())
           }
       }
       
       // ... continuar con update
   }
   ```

2. **Agregar middleware de permisos** en el router:
   ```go
   orders.Put("/:id/items", middleware.RequireRole("mesero", "admin"), orderHandler.UpdateOrderItems)
   ```

3. **Documentar restricciones** en [MENU_API_DOCUMENTATION.md](Backend/api/MENU_API_DOCUMENTATION.md)

### 7.2. Mediano Plazo (Funcionalidad Nueva)

1. **Implementar endpoints granulares:**
   - `POST /api/orders/:id/items` - Agregar item
   - `PATCH /api/orders/:id/items/:index` - Editar item específico
   - `DELETE /api/orders/:id/items/:index` - Eliminar item

2. **Agregar índice a items:**
   ```go
   type OrderItem struct {
       Index      int       `json:"index" db:"index"`  // Nuevo campo
       MenuItemID uuid.UUID `json:"menu_item_id"`
       // ...
   }
   ```

3. **Implementar auditoría de cambios:**
   ```sql
   CREATE TABLE order_changes (
       id UUID PRIMARY KEY,
       order_id UUID REFERENCES orders(id),
       changed_by UUID REFERENCES users(id),
       change_type VARCHAR(50), -- 'item_added', 'item_removed', 'item_modified'
       old_value JSONB,
       new_value JSONB,
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

### 7.3. Largo Plazo (Arquitectura)

1. **Eventos de dominio** para cambios en órdenes
2. **Sistema de versionado** de órdenes
3. **Bloqueo optimista** para prevenir ediciones concurrentes
4. **Integration con sistema de inventario** para validar disponibilidad

---

## 8. Conclusión

### ✅ Capacidades Actuales

- Actualización completa de items de una orden
- Cambio de estado de orden
- Reasignación de mesero (admin)
- Integración con WebSocket para notificaciones en tiempo real

### ❌ Limitaciones Críticas

- No soporta edición granular de items individuales
- No soporta edición de sub-items (customizaciones) de forma independiente
- Falta de validaciones de estado y permisos
- Complejidad innecesaria en el frontend

### 📊 Impacto en UX

- **Bajo:** Para órdenes pequeñas (1-3 items)
- **Medio:** Para órdenes medianas (4-7 items)
- **Alto:** Para órdenes grandes (8+ items) o modificaciones frecuentes

### 🎯 Prioridad de Mejoras

1. **ALTA:** Agregar validaciones a `UpdateOrderItems`
2. **ALTA:** Documentar comportamiento actual y restricciones
3. **MEDIA:** Implementar endpoint para agregar item individual
4. **MEDIA:** Implementar endpoints para editar/eliminar items específicos
5. **BAJA:** Sistema de auditoría de cambios

---

_Análisis generado el 16 de febrero de 2026_  
_Backend Version: TurnyChain API v1.0_  
_Archivos analizados: order_handler.go, order_service.go, order_repository.go, router.go, domain/order.go_
