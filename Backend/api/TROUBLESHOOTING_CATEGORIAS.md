# 🔍 Diagnóstico: Error al Crear Categorías

## 📋 Estado Actual de los Archivos

### ✅ Archivos del Backend (Ya modificados correctamente)

#### 1. **internal/domain/category.go** ✅
```go
type Category struct {
    ID          uuid.UUID  `json:"id"`
    Name        string     `json:"name"`
    StationID   *uuid.UUID `json:"station_id,omitempty"` // ✅ Campo agregado
    StationName string     `json:"station_name,omitempty"` // ✅ Para el JOIN
}
```

#### 2. **internal/handler/category_handler.go** ✅
```go
type CategoryPayload struct {
    Name      string  `json:"name"`
    StationID *string `json:"station_id,omitempty"` // ✅ Campo agregado
}

func (h *CategoryHandler) Create(c *fiber.Ctx) error {
    // ✅ Parsea el payload correctamente
    // ✅ Valida station_id si viene
    // ✅ Llama al servicio con stationID
}
```

#### 3. **internal/service/category_service.go** ✅
```go
type CategoryService interface {
    Create(name string, stationID *uuid.UUID) (*domain.Category, error) // ✅ Signature actualizada
    Update(id uuid.UUID, name string, stationID *uuid.UUID) (*domain.Category, error) // ✅ Signature actualizada
}
```

#### 4. **internal/repository/category_repository.go** ✅
```go
func (r *categoryRepository) Create(name string, stationID *uuid.UUID) (*domain.Category, error) {
    cat := &domain.Category{ID: uuid.New(), Name: name, StationID: stationID}
    query := "INSERT INTO categories (id, name, station_id) VALUES ($1, $2, $3) RETURNING id"
    // ✅ Query actualizada con station_id
    err := r.db.QueryRow(query, cat.ID, cat.Name, cat.StationID).Scan(&cat.ID)
    return cat, err
}
```

---

## 🔍 Posibles Causas del Error

### 1. **Backend no reiniciado** ⚠️
El backend compilado sigue usando la versión anterior del código.

**Solución:**
```bash
cd /home/deivid/Documentos/TurnyChain/Backend/api

# Detener el proceso viejo
pkill -f "bin/api" || pkill -f "go run"

# Recompilar
go build -o bin/api ./cmd/api

# Iniciar
./bin/api
```

---

### 2. **Base de datos no tiene la columna station_id** ⚠️
La tabla `categories` no fue migrada correctamente.

**Verificar:**
```bash
cd /home/deivid/Documentos/TurnyChain/Backend/baseDatos

# Ver estructura de la tabla
PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "\d categories"

# Debería mostrar:
#  id         | uuid
#  name       | character varying(100)
#  station_id | uuid                    <- Esta debe existir
```

**Si falta station_id, aplicar migración:**
```bash
# Opción 1: Reiniciar BD completa (PIERDE DATOS)
docker-compose down -v
docker-compose up -d
sleep 5

# Opción 2: Solo agregar la columna (MANTIENE DATOS)
PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "ALTER TABLE categories ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES stations(id);"
```

---

### 3. **Endpoint incorrecto en el frontend** ⚠️
El frontend está enviando el request a una URL incorrecta.

**Verificar en el navegador (DevTools > Network):**
- URL llamada: `http://localhost:8080/api/categories` ✅
- Método: `POST` ✅
- Body:
```json
{
  "name": "Bebidas",
  "station_id": "e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02"
}
```

**Si el error es 404:**
- Verificar que el router tenga la ruta registrada en `internal/router/router.go`

**Si el error es 500:**
- Ver logs del backend para identificar el error exacto

---

### 4. **Error en la validación del UUID** ⚠️
El `station_id` enviado no es un UUID válido.

**Verificar en el backend que el UUID tenga este formato:**
```
e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02
```

**No debe ser:**
- `null` (sí se permite, pero debe ser NULL, no la string "null")
- `""` (string vacío)
- `undefined`
- Un número o formato incorrecto

---

### 5. **Problema de permisos en la base de datos** ⚠️
El usuario `postgres` no tiene permisos para insertar en `categories` con FK a `stations`.

**Verificar estaciones existen:**
```bash
PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "SELECT id, name FROM stations;"

# Debe mostrar:
# e01e6f2b-2250-4630-8a2e-8a3d2a1f9d01 | Cocina Principal
# e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02 | Bar
# e03e6f2b-2250-4630-8a2e-8a3d2a1f9d03 | Parrilla
# e04e6f2b-2250-4630-8a2e-8a3d2a1f9d04 | Postres
```

**Si no existen, la FK fallará.**

---

## 🧪 Pruebas Manuales con cURL

### Test 1: Crear categoría SIN estación
```bash
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Ensaladas"}'

# Respuesta esperada: 201 Created
{
  "id": "uuid-generado",
  "name": "Ensaladas",
  "station_id": null
}
```

### Test 2: Crear categoría CON estación
```bash
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bebidas Frías",
    "station_id": "e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02"
  }'

# Respuesta esperada: 201 Created
{
  "id": "uuid-generado",
  "name": "Bebidas Frías",
  "station_id": "e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02"
}
```

### Test 3: Crear categoría con station_id inválido
```bash
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "station_id": "invalid-uuid"
  }'

# Respuesta esperada: 400 Bad Request
{
  "error": "Invalid station_id"
}
```

### Test 4: Ver todas las categorías
```bash
curl http://localhost:8080/api/categories

# Respuesta esperada: 200 OK
[
  {
    "id": "...",
    "name": "Platos Fuertes",
    "station_id": "e01e6f2b-2250-4630-8a2e-8a3d2a1f9d01",
    "station_name": "Cocina Principal"
  },
  ...
]
```

---

## 🔥 Solución Rápida (Reset Completo)

Si nada funciona, hacer un reset total:

```bash
# 1. Detener todo
cd /home/deivid/Documentos/TurnyChain/Backend/api
pkill -f "bin/api" || pkill -f "go run"

cd /home/deivid/Documentos/TurnyChain/Backend/baseDatos
docker-compose down -v

# 2. Levantar BD limpia
docker-compose up -d
sleep 5

# 3. Verificar que las tablas se crearon
PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "\d categories"
PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "SELECT id, name FROM stations;"

# 4. Recompilar backend
cd /home/deivid/Documentos/TurnyChain/Backend/api
go build -o bin/api ./cmd/api

# 5. Iniciar backend
./bin/api

# 6. Probar desde el navegador
```

---

## 📊 Checklist de Verificación

Marca lo que ya verificaste:

- [ ] Backend compilado sin errores (`go build -o bin/api ./cmd/api`)
- [ ] Backend reiniciado después de la compilación
- [ ] Base de datos tiene la tabla `categories` con columna `station_id`
- [ ] Tabla `stations` tiene datos de prueba
- [ ] Endpoint `/api/categories` responde (GET)
- [ ] Frontend envía el payload correcto (verificar en Network tab)
- [ ] El `station_id` es un UUID válido o `null`
- [ ] No hay errores en los logs del backend
- [ ] No hay errores en la consola del frontend

---

## 🆘 Cómo Obtener Logs del Backend

Si el backend está corriendo con `./bin/api`:

```bash
# Ver logs en tiempo real
tail -f /home/deivid/Documentos/TurnyChain/Backend/api/backend.log

# O si se ejecutó sin log file, revisar la terminal donde se inició
```

Si se ejecutó con `go run`:

```bash
# Los logs aparecen directamente en la terminal
```

---

## 💡 Mensaje de Error Común y Solución

### "Cannot parse JSON"
- **Causa:** El frontend no está enviando Content-Type correcto
- **Solución:** Agregar header `Content-Type: application/json`

### "Invalid station_id"
- **Causa:** El UUID tiene formato incorrecto
- **Solución:** Usar UUIDs válidos de la tabla `stations`

### "Could not create category" (500)
- **Causa:** Error en la base de datos (FK constraint, columna faltante, etc.)
- **Solución:** Ver logs del backend para el error específico de PostgreSQL

### "404 Not Found"
- **Causa:** El router no tiene la ruta registrada
- **Solución:** Verificar `internal/router/router.go` líneas de categorías

---

## ✅ Siguiente Paso

Ejecuta este comando para probar si el endpoint funciona:

```bash
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Categoria"}'
```

**Si responde 201:** ✅ El backend está bien, el problema es en el frontend.  
**Si responde 500:** ⚠️ Ver logs del backend para identificar el error de BD.  
**Si responde 404:** ⚠️ El router no tiene la ruta registrada.  
**Si no responde:** ⚠️ El backend no está corriendo.

---

**Última actualización:** 25 de diciembre, 2025

