# 🥡 Implementación de Órdenes Híbridas

## 📋 Resumen
Se implementó el soporte para **órdenes híbridas** en el backend, permitiendo que cada ítem individual de una orden pueda ser marcado como "para llevar" independientemente del resto de la orden.

## 🎯 Escenario Solucionado
**Ejemplo:** Una familia come en la mesa (4 platos), pero piden una hamburguesa adicional "para llevarle al hijo que se quedó en casa".

- ✅ Los 4 platos se sirven en plato (para comer en mesa)
- ✅ La hamburguesa se empaca (para llevar)
- ✅ Sin desperdiciar material ni tiempo

## 🔧 Cambios Realizados

### 1. Base de Datos (`baseDatos/init.sql`)
```sql
-- Agregado a la tabla order_items
"is_takeout" boolean NOT NULL DEFAULT false
```

**¿Qué hace?** 
- Cada ítem ahora tiene su propia bandera indicando si es para llevar
- Por defecto es `false` (para comer en mesa)
- El cocinero sabrá exactamente qué empacar y qué servir en plato

### 2. Modelo de Dominio (`api/internal/domain/order.go`)
```go
type OrderItem struct {
    // ...campos existentes...
    IsTakeout bool `json:"is_takeout" db:"is_takeout"` // NUEVO
}
```

**¿Qué hace?**
- El struct OrderItem ahora incluye el campo `is_takeout`
- Se serializa automáticamente en JSON para el frontend
- Se mapea automáticamente con la columna de la base de datos

### 3. Repositorio (`api/internal/repository/order_repository.go`)
Se actualizaron **4 funciones** para manejar el campo `is_takeout`:

#### a) `CreateOrder`
```go
// INSERT ahora incluye is_takeout
itemQuery := `INSERT INTO order_items (..., is_takeout) VALUES (..., $7)`
tx.Exec(itemQuery, ..., item.IsTakeout)
```

#### b) `GetOrders` 
```go
// SELECT ahora trae is_takeout
itemsQuery := `SELECT ..., oi.is_takeout FROM order_items oi ...`
rows.Scan(..., &item.IsTakeout)
```

#### c) `loadOrderItems` (método auxiliar)
```go
// SELECT ahora trae is_takeout
itemsQuery := `SELECT ..., oi.is_takeout FROM order_items oi ...`
rows.Scan(..., &item.IsTakeout)
```

#### d) `UpdateOrderItems`
```go
// INSERT ahora incluye is_takeout
itemQuery := `INSERT INTO order_items (..., is_takeout) VALUES (..., $7)`
tx.Exec(itemQuery, ..., item.IsTakeout)
```

## 📡 Contrato API (JSON)

### Request: Crear Orden
```json
{
  "waiter_id": "uuid",
  "table_id": "uuid",
  "items": [
    {
      "menu_item_id": "uuid",
      "quantity": 3,
      "price_at_order": 50.00,
      "is_takeout": false  // ← Comer en mesa
    },
    {
      "menu_item_id": "uuid",
      "quantity": 1,
      "price_at_order": 15.00,
      "is_takeout": true   // ← Para llevar 🥡
    }
  ]
}
```

### Response: Orden Creada
```json
{
  "id": "uuid",
  "table_number": 1,
  "status": "pendiente_aprobacion",
  "total": 165.00,
  "items": [
    {
      "menu_item_id": "uuid",
      "menu_item_name": "Picada de la Casa",
      "quantity": 3,
      "price_at_order": 50.00,
      "is_takeout": false
    },
    {
      "menu_item_id": "uuid",
      "menu_item_name": "Hamburguesa Especial",
      "quantity": 1,
      "price_at_order": 15.00,
      "is_takeout": true  // ← Esta se empaca
    }
  ]
}
```

## 🍳 Para la Cocina (Próximo Paso Frontend)
Cuando se imprima o muestre la comanda:

```
═══════════════════════════════
         MESA 1
═══════════════════════════════
3x Picada de la Casa
   🍽️ Servir en plato

1x Hamburguesa Especial
   🥡 PARA LLEVAR ← Destacado
═══════════════════════════════
```

## ✅ Verificación
- ✅ Compilación exitosa sin errores
- ✅ Todos los queries SQL actualizados
- ✅ Todos los scans de base de datos actualizados
- ✅ Struct de dominio actualizado
- ✅ Compatibilidad con WebSocket mantenida

## 🔄 Migración de Base de Datos
Si ya tienes una base de datos existente, ejecuta:

```sql
-- Agregar columna a tabla existente
ALTER TABLE order_items ADD COLUMN is_takeout BOOLEAN NOT NULL DEFAULT false;
```

Si es una instalación nueva, simplemente ejecuta el `init.sql` actualizado.

## 📱 Próximos Pasos (Frontend)
1. Agregar un switch global "Mesa/Llevar" en el carrito
2. Permitir cambiar el estado individual de cada ítem (ícono 🍽️/🥡)
3. Mostrar claramente en la comanda qué items son para llevar
4. El switch global define el valor por defecto al agregar items

---
**Fecha de Implementación:** 2025-12-20  
**Compatibilidad:** Backend Go + PostgreSQL  
**Estado:** ✅ Implementado y Verificado

