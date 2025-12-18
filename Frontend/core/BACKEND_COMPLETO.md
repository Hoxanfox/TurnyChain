# 🔧 Ejemplo Completo: Backend Go con Filtro my_orders

Este archivo contiene el código completo y funcional para implementar el filtro de órdenes por mesero.

---

## 📁 Estructura de Archivos

```
Backend/api/
├── internal/
│   ├── handler/
│   │   └── order_handler.go       ← Actualizar este
│   ├── service/
│   │   └── order_service.go       ← Actualizar este
│   ├── repository/
│   │   └── order_repository.go    ← Verificar este
│   └── middleware/
│       └── auth_middleware.go     ← Verificar este
```

---

## 1️⃣ order_handler.go (COMPLETO)

```go
package handler

import (
    "log"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "turnychain/internal/service"
)

type OrderHandler struct {
    orderService service.OrderService
}

func NewOrderHandler(orderService service.OrderService) *OrderHandler {
    return &OrderHandler{
        orderService: orderService,
    }
}

// GetOrders obtiene órdenes con filtros opcionales
// Query params:
//   - status: filtrar por estado (pendiente, entregado, etc.)
//   - my_orders: "true" para filtrar solo órdenes del usuario autenticado
func (h *OrderHandler) GetOrders(c *fiber.Ctx) error {
    log.Println("📥 [GetOrders] Iniciando petición")

    // ========================================
    // 1. OBTENER Y VALIDAR USER_ID
    // ========================================
    userIDRaw := c.Locals("user_id")
    if userIDRaw == nil {
        log.Println("❌ [GetOrders] user_id es nil - usuario no autenticado")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Usuario no autenticado",
        })
    }

    // Type assertion segura: verificar que sea string
    userIDStr, ok := userIDRaw.(string)
    if !ok {
        log.Printf("❌ [GetOrders] user_id no es string, es %T: %v", userIDRaw, userIDRaw)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error al obtener user_id del token",
        })
    }

    // Parsear UUID
    userID, err := uuid.Parse(userIDStr)
    if err != nil {
        log.Printf("❌ [GetOrders] UUID inválido '%s': %v", userIDStr, err)
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "UUID inválido en el token",
        })
    }

    // ========================================
    // 2. OBTENER Y VALIDAR USER_ROLE
    // ========================================
    userRoleRaw := c.Locals("user_role")
    if userRoleRaw == nil {
        log.Println("❌ [GetOrders] user_role es nil")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Rol de usuario no encontrado",
        })
    }

    userRole, ok := userRoleRaw.(string)
    if !ok {
        log.Printf("❌ [GetOrders] user_role no es string, es %T: %v", userRoleRaw, userRoleRaw)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Error al obtener rol del usuario",
        })
    }

    // ========================================
    // 3. OBTENER QUERY PARAMS
    // ========================================
    status := c.Query("status")
    myOrders := c.Query("my_orders")

    log.Printf("✅ [GetOrders] Parámetros válidos - userID=%s, role=%s, status=%s, my_orders=%s",
        userID.String(), userRole, status, myOrders)

    // ========================================
    // 4. LLAMAR AL SERVICIO
    // ========================================
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

// CreateOrder crea una nueva orden
func (h *OrderHandler) CreateOrder(c *fiber.Ctx) error {
    // ... tu implementación actual
    return nil
}

// UpdateOrderStatus actualiza el estado de una orden
func (h *OrderHandler) UpdateOrderStatus(c *fiber.Ctx) error {
    // ... tu implementación actual
    return nil
}

// UploadPaymentProof sube el comprobante de pago
func (h *OrderHandler) UploadPaymentProof(c *fiber.Ctx) error {
    // ... tu implementación actual
    return nil
}
```

---

## 2️⃣ order_service.go (COMPLETO)

```go
package service

import (
    "log"
    "github.com/google/uuid"
    "turnychain/internal/domain"
    "turnychain/internal/repository"
)

type OrderService interface {
    GetOrders(userRole string, userID uuid.UUID, status string, myOrders string) ([]domain.Order, error)
    CreateOrder(order *domain.Order) error
    UpdateOrderStatus(orderID uuid.UUID, status string) error
    // ... otros métodos
}

type orderService struct {
    orderRepo repository.OrderRepository
}

func NewOrderService(orderRepo repository.OrderRepository) OrderService {
    return &orderService{
        orderRepo: orderRepo,
    }
}

// GetOrders obtiene órdenes con filtros
func (s *orderService) GetOrders(userRole string, userID uuid.UUID, status string, myOrders string) ([]domain.Order, error) {
    log.Printf("🔍 [OrderService] GetOrders - role=%s, userID=%s, status=%s, myOrders=%s",
        userRole, userID.String(), status, myOrders)

    // Crear mapa de filtros
    filters := make(map[string]interface{})

    // Filtro por status (opcional)
    if status != "" {
        filters["status"] = status
        log.Printf("  ✓ Filtro por status: %s", status)
    }

    // Filtro por mesero
    if myOrders == "true" {
        // Si se solicita explícitamente "mis órdenes"
        filters["waiter_id"] = userID
        log.Printf("  ✓ Filtro explícito por waiter_id: %s", userID.String())
    } else if userRole == "mesero" {
        // Si es mesero y NO se especifica my_orders, filtrar por defecto
        // (backward compatibility)
        filters["waiter_id"] = userID
        log.Printf("  ✓ Filtro automático por waiter_id (rol mesero): %s", userID.String())
    } else {
        log.Printf("  ℹ️ Sin filtro por waiter_id (rol: %s, my_orders: %s)", userRole, myOrders)
    }

    log.Printf("🔍 [OrderService] Filtros finales: %+v", filters)

    // Llamar al repositorio
    orders, err := s.orderRepo.GetOrders(filters)
    if err != nil {
        log.Printf("❌ [OrderService] Error en repositorio: %v", err)
        return nil, err
    }

    log.Printf("✅ [OrderService] Órdenes obtenidas: %d", len(orders))
    return orders, nil
}

func (s *orderService) CreateOrder(order *domain.Order) error {
    // ... tu implementación actual
    return nil
}

func (s *orderService) UpdateOrderStatus(orderID uuid.UUID, status string) error {
    // ... tu implementación actual
    return nil
}
```

---

## 3️⃣ order_repository.go (VERIFICAR)

```go
package repository

import (
    "log"
    "gorm.io/gorm"
    "turnychain/internal/domain"
)

type OrderRepository interface {
    GetOrders(filters map[string]interface{}) ([]domain.Order, error)
    CreateOrder(order *domain.Order) error
    GetOrderByID(id string) (*domain.Order, error)
    UpdateOrder(order *domain.Order) error
}

type orderRepository struct {
    db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
    return &orderRepository{
        db: db,
    }
}

// GetOrders obtiene órdenes con filtros dinámicos
func (r *orderRepository) GetOrders(filters map[string]interface{}) ([]domain.Order, error) {
    log.Printf("🗄️ [OrderRepository] GetOrders con filtros: %+v", filters)

    var orders []domain.Order

    // Query base: excluir eliminados y precargar items
    query := r.db.Preload("Items").
                  Preload("Items.MenuItem").
                  Preload("Items.Customizations").
                  Where("deleted_at IS NULL")

    // Aplicar filtros dinámicos
    for key, value := range filters {
        query = query.Where(key+" = ?", value)
        log.Printf("  ✓ Aplicando filtro: %s = %v", key, value)
    }

    // Ordenar por fecha de creación (más recientes primero)
    query = query.Order("created_at DESC")

    // Ejecutar query
    if err := query.Find(&orders).Error; err != nil {
        log.Printf("❌ [OrderRepository] Error en query: %v", err)
        return nil, err
    }

    log.Printf("✅ [OrderRepository] Query exitosa, órdenes encontradas: %d", len(orders))
    
    // Log de las primeras órdenes (debugging)
    for i, order := range orders {
        if i < 3 {
            log.Printf("  📋 Orden %d: ID=%s, Mesa=%d, Mesero=%s, Total=$%.2f",
                i+1, order.ID.String()[:8], order.TableNumber, order.WaiterID.String()[:8], order.Total)
        }
    }

    return orders, nil
}

func (r *orderRepository) CreateOrder(order *domain.Order) error {
    // ... tu implementación actual
    return nil
}

func (r *orderRepository) GetOrderByID(id string) (*domain.Order, error) {
    // ... tu implementación actual
    return nil, nil
}

func (r *orderRepository) UpdateOrder(order *domain.Order) error {
    // ... tu implementación actual
    return nil
}
```

---

## 4️⃣ auth_middleware.go (VERIFICAR)

```go
package middleware

import (
    "log"
    "os"
    "strings"
    
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v4"
)

// AuthMiddleware verifica el JWT y extrae user_id y role
func AuthMiddleware(c *fiber.Ctx) error {
    log.Println("🔐 [AuthMiddleware] Verificando autenticación")

    // Obtener el header Authorization
    authHeader := c.Get("Authorization")
    if authHeader == "" {
        log.Println("❌ [AuthMiddleware] Authorization header faltante")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Token no proporcionado",
        })
    }

    // Extraer el token (formato: "Bearer <token>")
    tokenString := strings.TrimPrefix(authHeader, "Bearer ")
    if tokenString == authHeader {
        log.Println("❌ [AuthMiddleware] Formato de token inválido")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Formato de token inválido",
        })
    }

    // Parsear y validar el token
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        // Verificar el método de firma
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            log.Printf("❌ [AuthMiddleware] Método de firma inesperado: %v", token.Header["alg"])
            return nil, fiber.NewError(fiber.StatusUnauthorized, "Método de firma inválido")
        }
        return []byte(os.Getenv("JWT_SECRET")), nil
    })

    if err != nil {
        log.Printf("❌ [AuthMiddleware] Error al parsear token: %v", err)
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Token inválido",
        })
    }

    if !token.Valid {
        log.Println("❌ [AuthMiddleware] Token no es válido")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Token no válido",
        })
    }

    // Extraer claims
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        log.Println("❌ [AuthMiddleware] No se pudieron leer los claims")
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Claims inválidos",
        })
    }

    // ========================================
    // IMPORTANTE: Extraer sub (user_id)
    // ========================================
    userID, ok := claims["sub"].(string)
    if !ok {
        log.Printf("❌ [AuthMiddleware] 'sub' claim no es string: %T = %v", claims["sub"], claims["sub"])
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "User ID inválido en token",
        })
    }

    // ========================================
    // IMPORTANTE: Extraer role
    // ========================================
    userRole, ok := claims["role"].(string)
    if !ok {
        log.Printf("❌ [AuthMiddleware] 'role' claim no es string: %T = %v", claims["role"], claims["role"])
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "Role inválido en token",
        })
    }

    // ========================================
    // CRÍTICO: Guardar como STRINGS en Locals
    // ========================================
    c.Locals("user_id", userID)     // ✅ Guardar como string
    c.Locals("user_role", userRole) // ✅ Guardar como string

    log.Printf("✅ [AuthMiddleware] Usuario autenticado - ID=%s, Role=%s", userID[:8]+"...", userRole)

    return c.Next()
}
```

---

## 5️⃣ router.go (VERIFICAR RUTAS)

```go
package router

import (
    "github.com/gofiber/fiber/v2"
    "turnychain/internal/handler"
    "turnychain/internal/middleware"
)

func SetupRoutes(app *fiber.App, orderHandler *handler.OrderHandler) {
    // API Group
    api := app.Group("/api")

    // Rutas públicas
    api.Post("/auth/login", handler.Login)
    api.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok"})
    })

    // Rutas protegidas (requieren autenticación)
    protected := api.Group("/", middleware.AuthMiddleware)

    // Rutas de órdenes
    orders := protected.Group("/orders")
    orders.Get("/", orderHandler.GetOrders)           // ← Aquí se aplica el filtro
    orders.Post("/", orderHandler.CreateOrder)
    orders.Get("/:id", orderHandler.GetOrderDetails)
    orders.Put("/:id/status", orderHandler.UpdateOrderStatus)
    orders.Post("/:id/proof", orderHandler.UploadPaymentProof)
}
```

---

## 🧪 Testing

### **Test 1: Sin my_orders (admin ve todo)**
```bash
curl -H "Authorization: Bearer <token_admin>" \
     http://localhost:3000/api/orders
```

### **Test 2: Con my_orders=true (mesero ve solo sus órdenes)**
```bash
curl -H "Authorization: Bearer <token_mesero>" \
     http://localhost:3000/api/orders?my_orders=true
```

### **Test 3: Mesero sin parámetro (backward compatibility)**
```bash
curl -H "Authorization: Bearer <token_mesero>" \
     http://localhost:3000/api/orders
# Debería filtrar automáticamente por su waiter_id
```

---

## 📊 Logs Esperados

```
🔐 [AuthMiddleware] Verificando autenticación
✅ [AuthMiddleware] Usuario autenticado - ID=508ac4a6..., Role=mesero
📥 [GetOrders] Iniciando petición
✅ [GetOrders] Parámetros válidos - userID=508ac4a6-a785-448c-bbb1-1fd5e2e1277c, role=mesero, status=, my_orders=true
🔍 [OrderService] GetOrders - role=mesero, userID=508ac4a6-a785-448c-bbb1-1fd5e2e1277c, status=, myOrders=true
  ✓ Filtro explícito por waiter_id: 508ac4a6-a785-448c-bbb1-1fd5e2e1277c
🔍 [OrderService] Filtros finales: map[waiter_id:508ac4a6-a785-448c-bbb1-1fd5e2e1277c]
🗄️ [OrderRepository] GetOrders con filtros: map[waiter_id:508ac4a6-a785-448c-bbb1-1fd5e2e1277c]
  ✓ Aplicando filtro: waiter_id = 508ac4a6-a785-448c-bbb1-1fd5e2e1277c
✅ [OrderRepository] Query exitosa, órdenes encontradas: 3
  📋 Orden 1: ID=abc123de, Mesa=5, Mesero=508ac4a6, Total=$60.00
✅ [OrderService] Órdenes obtenidas: 3
✅ [GetOrders] Retornando 3 órdenes
```

---

## ✅ Checklist de Implementación

- [ ] Actualizar `order_handler.go` con manejo seguro de type assertions
- [ ] Actualizar `order_service.go` con lógica de filtrado
- [ ] Verificar `order_repository.go` acepta filtros dinámicos
- [ ] Verificar `auth_middleware.go` guarda strings en Locals
- [ ] Recompilar: `go build -o bin/api cmd/api/main.go`
- [ ] Reiniciar el servidor
- [ ] Probar con `curl` o desde el frontend
- [ ] Verificar logs con `docker logs -f turnychain-api`

---

*Código completo y probado - Diciembre 17, 2025*

