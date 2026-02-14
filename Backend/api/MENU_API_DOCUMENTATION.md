# 📋 Documentación API de Menú - TurnyChain

## Descripción General

El sistema de gestión de menú permite realizar operaciones CRUD completas (Crear, Leer, Actualizar, Eliminar) sobre los items del menú del restaurante. Todos los endpoints requieren autenticación mediante token JWT.

---

## 🔐 Autenticación

Todos los endpoints del menú requieren un token JWT válido en el header:

```
Authorization: Bearer <tu_token_jwt>
```

Para obtener el token, primero debes iniciar sesión:

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "tu_usuario",
  "password": "tu_contraseña"
}
```

---

## 📍 Endpoints Disponibles

### 1. 📖 Obtener Todos los Items del Menú

**Endpoint:** `GET /api/menu/`

**Descripción:** Obtiene todos los items del menú disponibles, ordenados por popularidad (order_count) y nombre.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Hamburguesa Clásica",
    "description": "Hamburguesa de carne con lechuga, tomate y queso",
    "price": 12.99,
    "category_id": "660e8400-e29b-41d4-a716-446655440000",
    "category_name": "Platos Principales",
    "is_available": true,
    "order_count": 45,
    "ingredients": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440001",
        "name": "Carne de res"
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "Lechuga"
      }
    ],
    "accompaniments": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440001",
        "name": "Papas fritas"
      }
    ]
  }
]
```

**Códigos de Error:**
- `500` - Error interno del servidor

---

### 2. ➕ Crear Nuevo Item del Menú

**Endpoint:** `POST /api/menu/`

**Descripción:** Crea un nuevo item en el menú del restaurante.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body Request:**
```json
{
  "name": "Pizza Margarita",
  "description": "Pizza clásica con tomate, mozzarella y albahaca",
  "price": 15.50,
  "category_id": "660e8400-e29b-41d4-a716-446655440000",
  "ingredient_ids": [
    "770e8400-e29b-41d4-a716-446655440003",
    "770e8400-e29b-41d4-a716-446655440004"
  ],
  "accompaniment_ids": [
    "880e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Campos Requeridos:**
- `name` (string) - Nombre del item
- `description` (string) - Descripción del item
- `price` (float64) - Precio del item
- `category_id` (UUID) - ID de la categoría a la que pertenece
- `ingredient_ids` (array de UUID) - IDs de los ingredientes (puede ser vacío)
- `accompaniment_ids` (array de UUID) - IDs de los acompañamientos (puede ser vacío)

**Respuesta Exitosa (201 Created):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "name": "Pizza Margarita",
  "description": "Pizza clásica con tomate, mozzarella y albahaca",
  "price": 15.50,
  "category_id": "660e8400-e29b-41d4-a716-446655440000",
  "is_available": true,
  "order_count": 0
}
```

**Códigos de Error:**
- `400` - JSON inválido o datos incorrectos
- `500` - Error al crear el item

**Evento WebSocket:**
Cuando se crea un item, se envía un mensaje WebSocket:
```json
{
  "type": "MENU_ITEM_ADDED",
  "data": { /* objeto del item creado */ }
}
```

---

### 3. ✏️ Actualizar Item del Menú

**Endpoint:** `PUT /api/menu/:id`

**Descripción:** Actualiza un item existente del menú.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parámetros de URL:**
- `id` (UUID) - ID del item a actualizar

**Body Request:**
```json
{
  "name": "Pizza Margarita Premium",
  "description": "Pizza con ingredientes premium",
  "price": 18.99,
  "category_id": "660e8400-e29b-41d4-a716-446655440000",
  "ingredient_ids": [
    "770e8400-e29b-41d4-a716-446655440003",
    "770e8400-e29b-41d4-a716-446655440004",
    "770e8400-e29b-41d4-a716-446655440005"
  ],
  "accompaniment_ids": [
    "880e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Respuesta Exitosa (200 OK):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "name": "Pizza Margarita Premium",
  "description": "Pizza con ingredientes premium",
  "price": 18.99,
  "category_id": "660e8400-e29b-41d4-a716-446655440000",
  "is_available": true,
  "order_count": 12
}
```

**Códigos de Error:**
- `400` - ID inválido o JSON mal formado
- `500` - Error al actualizar el item

**Evento WebSocket:**
```json
{
  "type": "MENU_ITEM_UPDATED",
  "data": { /* objeto del item actualizado */ }
}
```

---

### 4. 🗑️ Eliminar Item del Menú

**Endpoint:** `DELETE /api/menu/:id`

**Descripción:** Elimina un item del menú (marca como no disponible).

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros de URL:**
- `id` (UUID) - ID del item a eliminar

**Respuesta Exitosa (204 No Content):**
```
(Sin contenido)
```

**Códigos de Error:**
- `400` - ID inválido
- `500` - Error al eliminar el item

**Evento WebSocket:**
```json
{
  "type": "MENU_ITEM_DELETED",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### 5. 📊 Incrementar Contador de Órdenes

**Endpoint:** `POST /api/menu/items/:id/increment-order-count`

**Descripción:** Incrementa el contador de veces que se ha ordenado un item (usado para estadísticas y ordenamiento).

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros de URL:**
- `id` (UUID) - ID del item

**Respuesta Exitosa (200 OK):**
```json
{
  "message": "Order count incremented successfully"
}
```

**Códigos de Error:**
- `400` - ID inválido
- `500` - Error al incrementar el contador

---

## 🏗️ Estructura de Datos

### MenuItem
```go
type MenuItem struct {
    ID             uuid.UUID       // ID único del item
    Name           string          // Nombre del plato
    Description    string          // Descripción detallada
    Price          float64         // Precio en la moneda base
    CategoryID     uuid.UUID       // ID de la categoría
    CategoryName   string          // Nombre de la categoría (solo lectura)
    IsAvailable    bool            // Disponibilidad del item
    OrderCount     int             // Número de veces ordenado
    Ingredients    []Ingredient    // Lista de ingredientes
    Accompaniments []Accompaniment // Lista de acompañamientos
}
```

### Ingredient
```go
type Ingredient struct {
    ID   uuid.UUID
    Name string
}
```

### Accompaniment
```go
type Accompaniment struct {
    ID   uuid.UUID
    Name string
}
```

---

## 🔄 Flujo de Trabajo Típico

### Agregar un Nuevo Plato al Menú

1. **Crear la categoría** (si no existe):
   ```http
   POST /api/categories/
   ```

2. **Crear ingredientes** (si no existen):
   ```http
   POST /api/ingredients/
   ```

3. **Crear acompañamientos** (si no existen):
   ```http
   POST /api/accompaniments/
   ```

4. **Crear el item del menú**:
   ```http
   POST /api/menu/
   ```

### Actualizar un Plato

1. **Obtener el item actual**:
   ```http
   GET /api/menu/
   ```

2. **Actualizar con los nuevos datos**:
   ```http
   PUT /api/menu/{id}
   ```

### Eliminar un Plato

```http
DELETE /api/menu/{id}
```

---

## 📡 Integración con WebSockets

El sistema envía notificaciones en tiempo real a través de WebSocket cuando ocurren cambios en el menú:

**Conexión WebSocket:**
```
ws://localhost:8080/ws
```

**Eventos emitidos:**
- `MENU_ITEM_ADDED` - Cuando se crea un item
- `MENU_ITEM_UPDATED` - Cuando se actualiza un item
- `MENU_ITEM_DELETED` - Cuando se elimina un item

**Ejemplo de Escucha en JavaScript:**
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'MENU_ITEM_ADDED':
      console.log('Nuevo item:', message.data);
      break;
    case 'MENU_ITEM_UPDATED':
      console.log('Item actualizado:', message.data);
      break;
    case 'MENU_ITEM_DELETED':
      console.log('Item eliminado:', message.data.id);
      break;
  }
};
```

---

## 🧪 Ejemplos de Uso con cURL

### Obtener todos los items
```bash
curl -X GET http://localhost:8080/api/menu/ \
  -H "Authorization: Bearer tu_token_jwt"
```

### Crear un nuevo item
```bash
curl -X POST http://localhost:8080/api/menu/ \
  -H "Authorization: Bearer tu_token_jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tacos al Pastor",
    "description": "3 tacos con carne al pastor",
    "price": 8.99,
    "category_id": "660e8400-e29b-41d4-a716-446655440000",
    "ingredient_ids": [],
    "accompaniment_ids": []
  }'
```

### Actualizar un item
```bash
curl -X PUT http://localhost:8080/api/menu/990e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer tu_token_jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tacos al Pastor (Porción Grande)",
    "description": "5 tacos con carne al pastor",
    "price": 12.99,
    "category_id": "660e8400-e29b-41d4-a716-446655440000",
    "ingredient_ids": [],
    "accompaniment_ids": []
  }'
```

### Eliminar un item
```bash
curl -X DELETE http://localhost:8080/api/menu/990e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer tu_token_jwt"
```

---

## 🔍 Notas Importantes

1. **UUIDs:** Todos los IDs utilizan el formato UUID v4
2. **Autenticación:** Es obligatoria para todos los endpoints del menú
3. **Ordenamiento:** Los items se devuelven ordenados por popularidad (order_count DESC) y nombre (ASC)
4. **Disponibilidad:** Solo se retornan items con `is_available = true`
5. **Relaciones:** Los ingredientes y acompañamientos se gestionan mediante tablas de relación (many-to-many)
6. **WebSocket:** Los cambios se propagan en tiempo real a todos los clientes conectados

---

## 📂 Archivos Relacionados

- **Handler:** `/Backend/api/internal/handler/menu_handler.go`
- **Service:** `/Backend/api/internal/service/menu_service.go`
- **Repository:** `/Backend/api/internal/repository/menu_repository.go`
- **Domain:** `/Backend/api/internal/domain/menu_item.go`
- **Router:** `/Backend/api/internal/router/router.go`

---

## ⚠️ Consideraciones de Seguridad

- Valida siempre el token JWT antes de procesar las peticiones
- Los UUIDs deben ser validados antes de usarse en queries
- Implementa rate limiting para prevenir abuso
- Sanitiza los inputs antes de guardarlos en la base de datos

---

**Última actualización:** Febrero 2026
