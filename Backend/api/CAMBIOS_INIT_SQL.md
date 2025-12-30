# ✅ CAMBIOS APLICADOS AL init.sql

## 🔧 Modificaciones Realizadas

### Problema Original
El archivo `init.sql` tenía un problema de orden en la creación de tablas:
1. Creaba `categories` sin la columna `station_id`
2. Creaba `stations` después
3. Intentaba agregar `station_id` con `ALTER TABLE`

Esto podía causar problemas de dependencias y hacer que la columna no se agregara correctamente.

### Solución Aplicada ✅

**Nuevo orden de creación de tablas:**

1. `users` → Sin dependencias
2. `tables` → Sin dependencias
3. **`stations`** → Sin dependencias (MOVIDA ANTES)
4. `printers` → Depende de `stations` ✅
5. **`categories`** → Ahora tiene `station_id` desde la creación ✅
6. `ingredients` → Sin dependencias
7. `accompaniments` → Sin dependencias
8. `menu_items` → Depende de `categories` ✅
9. Resto de tablas...

### Cambio Principal en la Tabla `categories`

**ANTES:**
```sql
CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL
);

-- ... otras tablas ...

ALTER TABLE "categories" ADD COLUMN "station_id" uuid REFERENCES "stations"("id");
```

**AHORA:**
```sql
-- stations se crea PRIMERO
CREATE TABLE "stations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

-- categories se crea DESPUÉS con station_id incluido
CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL,
  "station_id" uuid REFERENCES "stations"("id")  -- ✅ AGREGADA DIRECTAMENTE
);
```

---

## 🚀 Pasos para Aplicar los Cambios

### Opción 1: Reinicio Completo de la Base de Datos (Recomendado para desarrollo)

**⚠️ ADVERTENCIA: Esto BORRARÁ todos los datos**

```bash
cd /home/deivid/Documentos/TurnyChain/Backend/baseDatos

# 1. Detener y eliminar el contenedor de PostgreSQL
docker-compose down -v

# 2. Levantar nuevamente (aplicará el init.sql actualizado)
docker-compose up -d

# 3. Esperar que la BD esté lista
sleep 5

# 4. Verificar que las tablas se crearon correctamente
docker exec $(docker ps -q -f name=postgres) psql -U postgres -d restaurant_db -c "\d categories"
```

**Resultado esperado:**
```
                Table "public.categories"
   Column   |          Type          | Nullable | Default
------------+------------------------+----------+---------
 id         | uuid                   | not null | gen_random_uuid()
 name       | character varying(100) | not null |
 station_id | uuid                   |          |  ← ✅ Esta columna debe aparecer
```

---

### Opción 2: Migración Manual (Mantiene los datos)

Si ya tienes datos importantes en la base de datos:

```bash
cd /home/deivid/Documentos/TurnyChain/Backend/baseDatos

# Aplicar el script de migración
docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d restaurant_db < fix_categories_station_id.sql
```

---

## 🔍 Verificación Post-Aplicación

Después de aplicar los cambios, verifica que todo esté correcto:

### 1. Verificar estructura de la tabla
```bash
docker exec $(docker ps -q -f name=postgres) psql -U postgres -d restaurant_db -c "\d categories"
```

### 2. Verificar que existan estaciones
```bash
docker exec $(docker ps -q -f name=postgres) psql -U postgres -d restaurant_db -c "SELECT id, name FROM stations;"
```

**Salida esperada:**
```
                  id                  |      name
--------------------------------------+-----------------
 e01e6f2b-2250-4630-8a2e-8a3d2a1f9d01 | Cocina Principal
 e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02 | Bar
 e03e6f2b-2250-4630-8a2e-8a3d2a1f9d03 | Parrilla
 e04e6f2b-2250-4630-8a2e-8a3d2a1f9d04 | Postres
```

### 3. Verificar categorías iniciales
```bash
docker exec $(docker ps -q -f name=postgres) psql -U postgres -d restaurant_db -c "SELECT id, name, station_id FROM categories;"
```

**Salida esperada:**
```
                  id                  |      name      |             station_id
--------------------------------------+----------------+--------------------------------------
 c01e6f2b-2250-4630-8a2e-8a3d2a1f9c34 | Platos Fuertes | e01e6f2b-2250-4630-8a2e-8a3d2a1f9d01
 c02e6f2b-2250-4630-8a2e-8a3d2a1f9c35 | Bebidas        | e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02
```

---

## 🎯 Próximos Pasos

Una vez que la base de datos esté correcta:

### 1. Iniciar el Backend
```bash
cd /home/deivid/Documentos/TurnyChain/Backend/api

# Si no está compilado
go build -o bin/api ./cmd/api

# Iniciar
./bin/api
```

### 2. Probar desde el Frontend
Ahora deberías poder:
- ✅ Ver la lista de categorías con sus estaciones asignadas
- ✅ Crear nuevas categorías sin estación
- ✅ Crear nuevas categorías con una estación asignada
- ✅ Editar categorías para cambiar su estación

### 3. Prueba rápida con cURL
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"1234"}' | jq -r '.token')

# Crear categoría con estación
curl -X POST http://localhost:8080/api/categories \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Postres",
    "station_id": "e04e6f2b-2250-4630-8a2e-8a3d2a1f9d04"
  }'
```

---

## 📝 Resumen

- ✅ `init.sql` actualizado con el orden correcto de tablas
- ✅ `categories` ahora tiene `station_id` desde la creación
- ✅ No se necesita más el `ALTER TABLE`
- ✅ Backend ya está preparado para manejar `station_id`
- ⚠️ Se requiere reiniciar la base de datos para aplicar cambios

---

**Fecha de actualización:** 25 de diciembre, 2024

