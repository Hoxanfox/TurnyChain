# TurnyChain Restaurant Management API

## 📋 Descripción

**TurnyChain** es una API REST desarrollada en Go para la gestión integral de restaurantes. El sistema proporciona funcionalidades completas para administrar pedidos, menús, usuarios, mesas y comunicación en tiempo real a través de WebSockets.

Esta API está diseñada con una arquitectura limpia y escalable, utilizando el patrón de capas (handlers, services, repositories) y siguiendo las mejores prácticas de desarrollo en Go.

## 🚀 Características Principales

### 1. **Gestión de Usuarios**
- Creación, lectura, actualización y eliminación de usuarios (CRUD completo)
- Roles de usuario (mesero, cajero, administrador)
- Sistema de autenticación JWT
- Contraseñas encriptadas con bcrypt
- Control de usuarios activos/inactivos

### 2. **Sistema de Autenticación y Autorización**
- Login con generación de tokens JWT
- Protección de rutas mediante middleware
- Tokens con expiración de 24 horas
- Validación de roles y permisos

### 3. **Gestión de Menú**
- CRUD completo de elementos del menú
- Organización por categorías
- Control de disponibilidad de productos
- Precios y descripciones
- Relación con ingredientes y acompañamientos
- Notificaciones en tiempo real de cambios en el menú

### 4. **Gestión de Pedidos**
- Creación de pedidos asociados a mesas
- Asignación de mesero responsable
- Estados de pedido (pendiente, en preparación, completado, etc.)
- Gestión de items del pedido con cantidades
- Personalización de pedidos:
  - Eliminación de ingredientes
  - Selección de acompañamientos
  - Notas especiales
- Actualización de estado de pedidos
- Cálculo automático de totales
- Notificaciones WebSocket en tiempo real para nuevos pedidos
- Actualización en tiempo real del estado de pedidos

### 5. **Gestión de Mesas**
- Registro de mesas del restaurante
- Numeración de mesas
- Control de mesas activas/inactivas
- Asociación de pedidos con mesas

### 6. **Gestión de Categorías**
- CRUD de categorías de menú
- Organización y clasificación de productos

### 7. **Gestión de Ingredientes**
- CRUD de ingredientes
- Asociación de ingredientes con items del menú
- Posibilidad de remover ingredientes en pedidos personalizados

### 8. **Gestión de Acompañamientos**
- CRUD de acompañamientos
- Precios individuales por acompañamiento
- Selección de acompañamientos en pedidos

### 9. **Sistema de Comunicación en Tiempo Real (WebSocket)**
- Hub de WebSocket para múltiples clientes conectados
- Broadcasting de mensajes a todos los clientes
- Notificaciones instantáneas de:
  - Nuevos pedidos pendientes
  - Cambios de estado de pedidos
  - Actualizaciones del menú
- Sistema de mensajes tipificado (tipo + payload)

## 🏗️ Arquitectura del Proyecto

El proyecto sigue una arquitectura en capas (Clean Architecture):

```
api/
├── cmd/api/              # Punto de entrada de la aplicación
│   └── main.go
├── internal/
│   ├── domain/           # Modelos de dominio (entidades)
│   │   ├── accompaniment.go
│   │   ├── category.go
│   │   ├── ingredient.go
│   │   ├── menu_item.go
│   │   ├── order.go
│   │   ├── table.go
│   │   └── user.go
│   ├── repository/       # Capa de acceso a datos
│   │   ├── accompaniment_repository.go
│   │   ├── category_repository.go
│   │   ├── ingredient_repository.go
│   │   ├── menu_repository.go
│   │   ├── order_repository.go
│   │   ├── table_repository.go
│   │   └── user_repository.go
│   ├── service/          # Lógica de negocio
│   │   ├── accompaniment_service.go
│   │   ├── auth_service.go
│   │   ├── category_service.go
│   │   ├── ingredient_service.go
│   │   ├── menu_service.go
│   │   ├── order_service.go
│   │   ├── table_service.go
│   │   └── user_service.go
│   ├── handler/          # Controladores HTTP
│   │   ├── accompaniment_handler.go
│   │   ├── auth_handler.go
│   │   ├── category_handler.go
│   │   ├── ingredient_handler.go
│   │   ├── menu_handler.go
│   │   ├── order_handler.go
│   │   ├── table_handler.go
│   │   ├── user_handler.go
│   │   └── websocket_handler.go
│   ├── middleware/       # Middlewares
│   │   └── auth_middleware.go
│   ├── router/           # Configuración de rutas
│   │   └── router.go
│   └── websocket/        # Sistema WebSocket
│       └── hub.go
├── Dockerfile            # Contenedor Docker
├── go.mod
├── go.sum
└── README.md
```

## 🛠️ Tecnologías Utilizadas

- **Go** 1.24.3 - Lenguaje de programación
- **Fiber v2** - Framework web de alto rendimiento
- **PostgreSQL** - Base de datos relacional
- **JWT** - Autenticación mediante tokens
- **WebSockets** - Comunicación en tiempo real
- **bcrypt** - Encriptación de contraseñas
- **UUID** - Identificadores únicos universales
- **Docker** - Contenedorización

### Dependencias Principales

```
github.com/gofiber/fiber/v2          # Framework web
github.com/gofiber/contrib/websocket # Soporte WebSocket
github.com/golang-jwt/jwt/v4         # Manejo de JWT
github.com/lib/pq                    # Driver PostgreSQL
golang.org/x/crypto                  # Bcrypt
github.com/google/uuid               # Generación de UUIDs
```

## 📡 API Endpoints

### Autenticación (Público)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión y obtener token JWT |

### WebSocket (Público)

| Ruta | Protocolo | Descripción |
|------|-----------|-------------|
| `/ws` | WebSocket | Conexión WebSocket para notificaciones en tiempo real |

### Usuarios (Protegido)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/users/` | Crear nuevo usuario |
| GET | `/api/users/` | Obtener lista de usuarios |
| PUT | `/api/users/:id` | Actualizar usuario |
| DELETE | `/api/users/:id` | Eliminar usuario |

### Menú (Protegido)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/menu/` | Obtener todos los items del menú |
| POST | `/api/menu/` | Crear nuevo item del menú |
| PUT | `/api/menu/:id` | Actualizar item del menú |
| DELETE | `/api/menu/:id` | Eliminar item del menú |

### Pedidos (Protegido)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/orders/` | Crear nuevo pedido |
| GET | `/api/orders/` | Obtener todos los pedidos |
| GET | `/api/orders/:id` | Obtener pedido por ID |
| PUT | `/api/orders/:id/status` | Actualizar estado del pedido |
| PUT | `/api/orders/:id/manage` | Gestionar pedido (cajero) |
| PUT | `/api/orders/:id/items` | Actualizar items del pedido |

### Mesas (Protegido)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/tables/` | Crear nueva mesa |
| GET | `/api/tables/` | Obtener todas las mesas |

### Categorías (Protegido)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/categories/` | Crear nueva categoría |
| GET | `/api/categories/` | Obtener todas las categorías |
| PUT | `/api/categories/:id` | Actualizar categoría |
| DELETE | `/api/categories/:id` | Eliminar categoría |

### Ingredientes (Protegido)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ingredients/` | Crear nuevo ingrediente |
| GET | `/api/ingredients/` | Obtener todos los ingredientes |
| PUT | `/api/ingredients/:id` | Actualizar ingrediente |
| DELETE | `/api/ingredients/:id` | Eliminar ingrediente |

### Acompañamientos (Protegido)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/accompaniments/` | Crear nuevo acompañamiento |
| GET | `/api/accompaniments/` | Obtener todos los acompañamientos |
| PUT | `/api/accompaniments/:id` | Actualizar acompañamiento |
| DELETE | `/api/accompaniments/:id` | Eliminar acompañamiento |

## 🔐 Autenticación

Todas las rutas protegidas requieren un token JWT en el header `Authorization`:

```
Authorization: Bearer <token>
```

El token se obtiene mediante el endpoint de login y tiene una validez de 24 horas.

## 📦 Instalación y Configuración

### Requisitos Previos

- Go 1.24.3 o superior
- PostgreSQL
- Docker (opcional)

### Instalación Local

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd Backend/api
```

2. Instalar dependencias:
```bash
go mod download
```

3. Configurar la base de datos:
```bash
# Crear base de datos PostgreSQL
createdb restaurant_db

# Configurar variable de entorno (opcional)
export DATABASE_URL="user=postgres password=1234 dbname=restaurant_db host=localhost sslmode=disable"
```

4. Ejecutar la aplicación:
```bash
go run cmd/api/main.go
```

La API estará disponible en `http://localhost:8080`

### Instalación con Docker

1. Construir la imagen:
```bash
docker build -t turnychain-api .
```

2. Ejecutar el contenedor:
```bash
docker run -p 8080:8080 \
  -e DATABASE_URL="user=postgres password=1234 dbname=restaurant_db host=host.docker.internal sslmode=disable" \
  turnychain-api
```

## 🌐 Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `user=postgres password=1234 dbname=restaurant_db host=localhost sslmode=disable` |
| `JWT_SECRET_KEY` | Clave secreta para firma de JWT | (definida en código - cambiar en producción) |

## 📊 Modelos de Datos

### User
```go
{
  "id": "uuid",
  "username": "string",
  "role": "string",      // mesero, cajero, admin
  "is_active": "boolean"
}
```

### MenuItem
```go
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "price": "float64",
  "category_id": "uuid",
  "is_available": "boolean",
  "ingredients": ["Ingredient"],
  "accompaniments": ["Accompaniment"]
}
```

### Order
```go
{
  "id": "uuid",
  "waiter_id": "uuid",
  "cashier_id": "uuid",      // opcional
  "table_id": "uuid",
  "table_number": "int",
  "status": "string",        // pendiente, en preparación, completado, etc.
  "total": "float64",
  "items": ["OrderItem"],
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### OrderItem
```go
{
  "menu_item_id": "uuid",
  "menu_item_name": "string",
  "quantity": "int",
  "price_at_order": "float64",
  "notes": "string",
  "customizations": {
    "removed_ingredients": ["Ingredient"],
    "selected_accompaniments": ["Accompaniment"]
  }
}
```

## 🔔 Sistema WebSocket

### Conexión
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
```

### Formato de Mensajes
```json
{
  "type": "NEW_PENDING_ORDER" | "ORDER_STATUS_UPDATED" | "MENU_UPDATED",
  "payload": { ... }
}
```

### Tipos de Mensajes

- **NEW_PENDING_ORDER**: Nuevo pedido creado
- **ORDER_STATUS_UPDATED**: Estado de pedido actualizado
- **MENU_UPDATED**: Cambios en el menú

## 🧪 Ejemplos de Uso

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

### Crear Pedido
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "waiter_id": "uuid",
    "table_id": "uuid",
    "items": [
      {
        "menu_item_id": "uuid",
        "quantity": 2,
        "notes": "Sin cebolla",
        "customizations": {
          "removed_ingredients": [{"id": "uuid", "name": "Cebolla"}],
          "selected_accompaniments": [{"id": "uuid", "name": "Papas fritas", "price": 2.5}]
        }
      }
    ]
  }'
```

### Obtener Menú
```bash
curl -X GET http://localhost:8080/api/menu \
  -H "Authorization: Bearer <token>"
```

## 🔄 Flujo de Trabajo Típico

1. **Usuario se autentica** → Obtiene token JWT
2. **Mesero consulta el menú** → Ve productos disponibles
3. **Cliente hace pedido** → Mesero crea pedido en el sistema
4. **Sistema notifica cocina** → WebSocket envía notificación en tiempo real
5. **Cocina actualiza estado** → "En preparación"
6. **Pedido completado** → Estado "Listo"
7. **Cajero cierra cuenta** → Actualiza pedido con ID de cajero
8. **WebSocket notifica** → Todos los clientes conectados reciben actualizaciones

## 📈 Características de Seguridad

- ✅ Contraseñas encriptadas con bcrypt
- ✅ Autenticación JWT con expiración
- ✅ Middleware de protección de rutas
- ✅ Validación de tokens
- ✅ CORS habilitado
- ✅ Separación de roles y permisos

## 🤝 Contribución

Este proyecto está en desarrollo activo. Para contribuir:

1. Fork del repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto es privado y está protegido por derechos de autor.

## 👥 Autor

TurnyChain Development Team

## 📞 Soporte

Para soporte y consultas, contacta al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2025

