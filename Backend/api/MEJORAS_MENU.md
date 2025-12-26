# Mejoras Implementadas en el Sistema de Menú

## 📋 Resumen de Cambios

Se han implementado mejoras en el backend para soportar las nuevas funcionalidades del frontend relacionadas con la **popularidad de items del menú** y **filtrado por categorías**.

---

## 🆕 Nuevas Características

### 1. **Campo `order_count` en Menu Items**
- Se agregó un contador que trackea cuántas veces se ha pedido cada item del menú
- Este contador se incrementa automáticamente cuando una orden es **aprobada** por el cajero
- Se utiliza para identificar los items más populares

### 2. **Campo `category_name` en la respuesta del menú**
- Ahora la respuesta incluye el nombre de la categoría además del `category_id`
- Esto permite al frontend mostrar y filtrar items sin hacer peticiones adicionales

### 3. **Endpoint para incrementar contador manualmente**
- Nuevo endpoint: `POST /api/menu/items/:id/increment-order-count`
- Permite incrementar manualmente el contador de un item específico (si se necesita)

---

## 📊 Cambios en Base de Datos

### Tabla `menu_items`
```sql
ALTER TABLE menu_items ADD COLUMN order_count integer NOT NULL DEFAULT 0;

-- Índices agregados para mejorar performance
CREATE INDEX ON menu_items (order_count);
CREATE INDEX ON menu_items (category_id);
```

---

## 🔌 API Endpoints

### **GET /api/menu**
Obtiene todos los items del menú con información extendida.

**Respuesta (Ejemplo):**
```json
[
  {
    "id": "m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41",
    "name": "Picada de la Casa",
    "description": "Una deliciosa mezcla de carnes",
    "price": 50.00,
    "category_id": "c01e6f2b-2250-4630-8a2e-8a3d2a1f9c34",
    "category_name": "Platos Fuertes",
    "is_available": true,
    "order_count": 145,
    "ingredients": [
      { "id": "...", "name": "Panceta" },
      { "id": "...", "name": "Bondiola" }
    ],
    "accompaniments": [
      { "id": "...", "name": "Papa", "price": 2.00 },
      { "id": "...", "name": "Yuca", "price": 2.50 }
    ]
  }
]
```

**Cambios implementados:**
- ✅ Los items se ordenan por popularidad (`order_count DESC`)
- ✅ Incluye `category_name` mediante JOIN con tabla `categories`
- ✅ Incluye `order_count` para mostrar popularidad

---

### **POST /api/menu/items/:id/increment-order-count** 🆕
Incrementa manualmente el contador de pedidos de un item.

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Parámetros de ruta:**
- `id` (UUID): ID del item del menú

**Respuesta exitosa (200):**
```json
{
  "message": "Order count incremented successfully"
}
```

**Casos de uso:**
- Corrección manual de contadores
- Ajustes administrativos
- Testing

---

## 🔄 Flujo Automático de Incremento

El contador `order_count` se incrementa **automáticamente** cuando:

1. Un **mesero** crea una orden
2. El **cajero** aprueba la orden (cambia estado de `pendiente_aprobacion` a `aprobado`)
3. Por cada item en la orden, se incrementa su `order_count` según la cantidad pedida

**Ejemplo:**
```
Orden con:
- 2x Hamburguesa Clásica
- 1x Gaseosa

Cuando se aprueba:
- order_count de "Hamburguesa Clásica" += 2
- order_count de "Gaseosa" += 1
```

---

## 🎯 Beneficios para el Frontend

### 1. **Filtrado por Categorías**
```javascript
// El frontend puede filtrar fácilmente sin hacer requests adicionales
const burgers = menuItems.filter(item => item.category_name === "Hamburguesas");
```

### 2. **Items Más Populares**
```javascript
// Los items ya vienen ordenados por popularidad
const topItems = menuItems.slice(0, 10); // Top 10 más pedidos
```

### 3. **Búsquedas Optimizadas**
- Los índices en `order_count` y `category_id` mejoran el rendimiento
- Las consultas son más rápidas incluso con muchos items

---

## 🛠️ Archivos Modificados

1. **Base de Datos:**
   - `baseDatos/init.sql` - Agregado campo `order_count` e índices

2. **Domain:**
   - `internal/domain/menu_item.go` - Agregados campos `CategoryName` y `OrderCount`

3. **Repository:**
   - `internal/repository/menu_repository.go`
     - Actualizada consulta `GetMenuItems()` con JOIN y ORDER BY
     - Agregado método `IncrementOrderCount()`

4. **Service:**
   - `internal/service/menu_service.go` - Agregado método `IncrementOrderCount()`
   - `internal/service/order_service.go` - Incremento automático al aprobar órdenes

5. **Handler:**
   - `internal/handler/menu_handler.go` - Agregado handler `IncrementOrderCount()`

6. **Router:**
   - `internal/router/router.go` - Agregada ruta POST para incrementar contador

---

## 🔍 Ejemplo de Uso

### Obtener menú con datos de popularidad:
```bash
GET /api/menu
Authorization: Bearer {token}
```

### Incrementar manualmente el contador:
```bash
POST /api/menu/items/m01e6f2b-2250-4630-8a2e-8a3d2a1f9c41/increment-order-count
Authorization: Bearer {token}
```

---

## 📈 Métricas y Monitoreo

Los logs ahora incluyen información sobre la actualización de contadores:

```
✅ Contadores de popularidad actualizados para orden abc-123-def
```

---

## 🚀 Próximas Mejoras Sugeridas

1. **Dashboard de Popularidad**: Endpoint para obtener estadísticas detalladas
2. **Filtros Avanzados**: Por rango de precios, disponibilidad, etc.
3. **Cache**: Implementar Redis para consultas frecuentes
4. **Trending Items**: Items con mayor crecimiento en las últimas 24h

---

## ✅ Testing

Para verificar que todo funciona correctamente:

1. **Reiniciar la base de datos** (aplicar cambios en `init.sql`)
2. **Compilar el backend**: `go build -o bin/api ./cmd/api`
3. **Iniciar el servidor**
4. **Crear una orden y aprobarla** - verificar que los contadores se incrementen
5. **Consultar el menú** - verificar que incluya `category_name` y `order_count`

---

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias, contacta al equipo de desarrollo.

---

**Última actualización:** 23 de diciembre de 2025
**Versión:** 1.0.0

