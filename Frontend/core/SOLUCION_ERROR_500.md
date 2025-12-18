# 🔧 Solución al Error 500: `GET /api/orders?my_orders=true`

## ❌ Error Identificado

```
GET http://localhost:3000/api/orders?my_orders=true
Status: 500 Internal Server Error
```

---

## 🔍 Diagnóstico del Problema

El error 500 en el backend Go ocurre en el endpoint `GetOrders`. Hay varios problemas potenciales:

### **Problema #1: Type Assertion Panic** ⚠️ MÁS PROBABLE

En tu código actual:
```go
func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
    userID, _ := uuid.Parse(c.Locals("user_id").(string))  // ❌ PANIC aquí
    userRole := c.Locals("user_role").(string)              // ❌ O aquí
    // ...
}
```

**¿Por qué falla?**
- `c.Locals("user_id")` podría retornar `nil` o un tipo diferente
- El type assertion `.(string)` causará un **panic** si el valor no es string
- El `uuid.Parse` podría fallar si el string no es un UUID válido

---

## ✅ Soluciones

### **Solución 1: Manejo Seguro de Type Assertions (RECOMENDADO)**

```go
func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
    // ✅ Obtener user_id de forma segura
    userIDRaw := c.Locals("user_id")
    if userIDRaw == nil {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Usuario no autenticado",
        })
    }

    // ✅ Verificar que sea string
    userIDStr, ok := userIDRaw.(string)
    if !ok {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error al obtener user_id del token",
        })
    }

    // ✅ Parsear UUID de forma segura
    userID, err := uuid.Parse(userIDStr)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "UUID inválido en el token",
        })
    }

    // ✅ Obtener role de forma segura
    userRoleRaw := c.Locals("user_role")
    if userRoleRaw == nil {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Rol de usuario no encontrado",
        })
    }

    userRole, ok := userRoleRaw.(string)
    if !ok {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error al obtener rol del usuario",
        })
    }

    // ✅ Continuar con la lógica
    status := c.Query("status")
    myOrders := c.Query("my_orders")

    orders, err := h.orderService.GetOrders(userRole, userID, status, myOrders)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": err.Error(),
        })
    }

    return c.JSON(orders)
}
```

---

### **Solución 2: Verificar el Middleware JWT**

El problema podría estar en cómo el middleware JWT almacena los valores en `c.Locals()`.

**Verifica tu middleware de autenticación:**

```go
func AuthMiddleware(c *fiber.Ctx) error {
    // Obtener token del header
    authHeader := c.Get("Authorization")
    if authHeader == "" {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Token no proporcionado",
        })
    }

    tokenString := strings.TrimPrefix(authHeader, "Bearer ")

    // Parsear token
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        return []byte(os.Getenv("JWT_SECRET")), nil
    })

    if err != nil || !token.Valid {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Token inválido",
        })
    }

    // Extraer claims
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Error al leer claims del token",
        })
    }

    // ✅ IMPORTANTE: Asegurarse de que sean strings
    userID, ok := claims["sub"].(string)
    if !ok {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "sub claim no es un string",
        })
    }

    userRole, ok := claims["role"].(string)
    if !ok {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "role claim no es un string",
        })
    }

    // ✅ Guardar como strings en Locals
    c.Locals("user_id", userID)
    c.Locals("user_role", userRole)

    return c.Next()
}
```

---

### **Solución 3: Verificar el Token JWT**

El token que estás enviando es:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjYwNTgwNDUsInJvbGUiOiJtZXNlcm8iLCJzdWIiOiI1MDhhYzRhNi1hNzg1LTQ0OGMtYmJiMS0xZmQ1ZTJlMTI3N2MifQ.i5GOlM2Qey-QKSglk4fWfDjWg6kmusodstDZWspLtv0
```

**Decodificación del token:**
```json
{
  "exp": 1766058045,
  "role": "mesero",
  "sub": "508ac4a6-a785-448c-bbb1-1fd5e2e1277c"
}
```

✅ El token es válido y contiene:
- `sub`: El UUID del usuario (correcto)
- `role`: "mesero" (correcto)
- `exp`: Expira en el futuro (correcto)

---

## 🔍 Problema #2: Error en orderService.GetOrders

El error también podría estar en el servicio:

```go
func (s *orderService) GetOrders(userRole string, userID uuid.UUID, status string, myOrders string) ([]domain.Order, error) {
    filters := make(map[string]interface{})
    
    if status != "" {
        filters["status"] = status
    }

    // ✅ Filtro por mesero
    if myOrders == "true" {
        filters["waiter_id"] = userID  // ⚠️ Verificar que waiter_id exista en la tabla
    } else if userRole == "mesero" {
        filters["waiter_id"] = userID
    }

    // ✅ Agregar logs para debugging
    log.Printf("Filters aplicados: %+v", filters)

    orders, err := s.orderRepo.GetOrders(filters)
    if err != nil {
        log.Printf("Error en orderRepo.GetOrders: %v", err)  // ✅ Log del error
        return nil, err
    }

    return orders, nil
}
```

---

## 🔍 Problema #3: Error en orderRepo.GetOrders

Verifica que el repositorio maneje correctamente el filtro `waiter_id`:

```go
func (r *orderRepository) GetOrders(filters map[string]interface{}) ([]domain.Order, error) {
    var orders []domain.Order

    query := r.db.Preload("Items").Where("deleted_at IS NULL")

    // ✅ Aplicar filtros
    for key, value := range filters {
        query = query.Where(key+" = ?", value)
    }

    // ✅ Log de la query SQL (para debugging)
    log.Printf("Query SQL generada: %v", query.Statement.SQL.String())

    if err := query.Find(&orders).Error; err != nil {
        log.Printf("Error en query: %v", err)  // ✅ Log del error
        return nil, err
    }

    return orders, nil
}
```

---

## 🧪 Cómo Debuggear

### **Paso 1: Agregar Logs en el Handler**

```go
func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
    log.Println("📥 GET /api/orders iniciado")
    
    // Log de los Locals
    log.Printf("c.Locals('user_id'): %v (tipo: %T)", c.Locals("user_id"), c.Locals("user_id"))
    log.Printf("c.Locals('user_role'): %v (tipo: %T)", c.Locals("user_role"), c.Locals("user_role"))
    
    // Log de query params
    log.Printf("Query params: status=%s, my_orders=%s", c.Query("status"), c.Query("my_orders"))
    
    // ... resto del código
}
```

### **Paso 2: Verificar los Logs del Backend**

Cuando hagas la petición `GET /api/orders?my_orders=true`, deberías ver:

```
📥 GET /api/orders iniciado
c.Locals('user_id'): 508ac4a6-a785-448c-bbb1-1fd5e2e1277c (tipo: string)
c.Locals('user_role'): mesero (tipo: string)
Query params: status=, my_orders=true
Filters aplicados: map[waiter_id:508ac4a6-a785-448c-bbb1-1fd5e2e1277c]
```

### **Paso 3: Verificar la Base de Datos**

```sql
-- Verificar que existan órdenes del mesero
SELECT * FROM orders 
WHERE waiter_id = '508ac4a6-a785-448c-bbb1-1fd5e2e1277c' 
AND deleted_at IS NULL;
```

---

## ✅ Solución Completa (Copiar y Pegar)

### **order_handler.go** (ACTUALIZADO)

```go
package handler

import (
    "log"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
)

func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
    log.Println("📥 [GetOrders] Iniciando petición")

    // ✅ 1. Obtener y validar user_id
    userIDRaw := c.Locals("user_id")
    if userIDRaw == nil {
        log.Println("❌ [GetOrders] user_id es nil")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Usuario no autenticado",
        })
    }

    userIDStr, ok := userIDRaw.(string)
    if !ok {
        log.Printf("❌ [GetOrders] user_id no es string: %T", userIDRaw)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error al obtener user_id del token",
        })
    }

    userID, err := uuid.Parse(userIDStr)
    if err != nil {
        log.Printf("❌ [GetOrders] UUID inválido: %v", err)
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "UUID inválido en el token",
        })
    }

    // ✅ 2. Obtener y validar user_role
    userRoleRaw := c.Locals("user_role")
    if userRoleRaw == nil {
        log.Println("❌ [GetOrders] user_role es nil")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Rol de usuario no encontrado",
        })
    }

    userRole, ok := userRoleRaw.(string)
    if !ok {
        log.Printf("❌ [GetOrders] user_role no es string: %T", userRoleRaw)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error al obtener rol del usuario",
        })
    }

    // ✅ 3. Obtener query params
    status := c.Query("status")
    myOrders := c.Query("my_orders")

    log.Printf("✅ [GetOrders] userID=%s, role=%s, status=%s, my_orders=%s", 
        userID.String(), userRole, status, myOrders)

    // ✅ 4. Llamar al servicio
    orders, err := h.orderService.GetOrders(userRole, userID, status, myOrders)
    if err != nil {
        log.Printf("❌ [GetOrders] Error en servicio: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": err.Error(),
        })
    }

    log.Printf("✅ [GetOrders] Retornando %d órdenes", len(orders))
    return c.JSON(orders)
}
```

---

## 🚀 Pasos para Aplicar la Solución

1. **Actualizar `order_handler.go`** con el código de arriba
2. **Recompilar el backend:**
   ```bash
   cd Backend/api
   go build -o bin/api cmd/api/main.go
   ```
3. **Reiniciar el servidor**
4. **Verificar los logs** cuando hagas la petición
5. **Si sigue fallando**, envíame los logs completos

---

## 📊 Resultado Esperado

### **Request:**
```
GET /api/orders?my_orders=true
Authorization: Bearer {token}
```

### **Logs del Backend:**
```
📥 [GetOrders] Iniciando petición
✅ [GetOrders] userID=508ac4a6-a785-448c-bbb1-1fd5e2e1277c, role=mesero, status=, my_orders=true
✅ [GetOrders] Retornando 3 órdenes
```

### **Response (200 OK):**
```json
[
  {
    "id": "order-uuid-1",
    "table_number": 5,
    "waiter_id": "508ac4a6-a785-448c-bbb1-1fd5e2e1277c",
    "status": "entregado",
    "total": 60.00
  }
]
```

---

## 🆘 Si el Error Persiste

Envíame:
1. **Logs completos del backend** (stdout/stderr)
2. **El código actual** de `order_handler.go`
3. **El código del middleware JWT**
4. **Resultado de:** `SELECT * FROM orders WHERE waiter_id = '508ac4a6-a785-448c-bbb1-1fd5e2e1277c' LIMIT 5;`

---

*Solución creada: 17 de diciembre de 2025*

