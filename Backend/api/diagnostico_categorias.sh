#!/bin/bash

# =================================================================
# Script de Diagnóstico para Creación de Categorías
# =================================================================

echo "🔍 DIAGNÓSTICO DEL SISTEMA DE CATEGORÍAS"
echo "========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =================================================================
# 1. VERIFICAR BASE DE DATOS
# =================================================================
echo "📦 1. Verificando Base de Datos..."
echo "-----------------------------------"

# Verificar si PostgreSQL está corriendo
if docker ps | grep -q postgres; then
    echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
else
    echo -e "${RED}❌ PostgreSQL NO está corriendo${NC}"
    echo "   Ejecuta: cd /home/deivid/Documentos/TurnyChain/Backend/baseDatos && docker-compose up -d"
    exit 1
fi

# Verificar estructura de la tabla categories
echo ""
echo "Verificando tabla 'categories'..."
PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "\d categories" > /tmp/categories_structure.txt 2>&1

if grep -q "station_id" /tmp/categories_structure.txt; then
    echo -e "${GREEN}✅ Columna 'station_id' existe en la tabla${NC}"
else
    echo -e "${RED}❌ Columna 'station_id' NO existe en la tabla${NC}"
    echo "   Ejecutando migración..."
    PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "ALTER TABLE categories ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES stations(id);"
    echo -e "${GREEN}✅ Migración aplicada${NC}"
fi

# Verificar que existan estaciones
echo ""
echo "Verificando estaciones disponibles..."
STATION_COUNT=$(PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -t -c "SELECT COUNT(*) FROM stations;" 2>/dev/null | xargs)

if [ "$STATION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Hay $STATION_COUNT estaciones disponibles${NC}"
    echo ""
    echo "Estaciones:"
    PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "SELECT id, name FROM stations;" 2>/dev/null
else
    echo -e "${RED}❌ No hay estaciones en la base de datos${NC}"
    echo "   Se necesitan estaciones para asignar a categorías"
fi

# =================================================================
# 2. VERIFICAR BACKEND
# =================================================================
echo ""
echo "🔧 2. Verificando Backend..."
echo "-----------------------------------"

# Verificar si el backend está compilado
if [ -f "/home/deivid/Documentos/TurnyChain/Backend/api/bin/api" ]; then
    echo -e "${GREEN}✅ Backend compilado existe${NC}"

    # Verificar fecha de modificación
    BACKEND_DATE=$(stat -c %Y /home/deivid/Documentos/TurnyChain/Backend/api/bin/api 2>/dev/null)
    HANDLER_DATE=$(stat -c %Y /home/deivid/Documentos/TurnyChain/Backend/api/internal/handler/category_handler.go 2>/dev/null)

    if [ "$BACKEND_DATE" -lt "$HANDLER_DATE" ]; then
        echo -e "${YELLOW}⚠️  Backend desactualizado (el código fuente es más nuevo)${NC}"
        echo "   Recompilando..."
        cd /home/deivid/Documentos/TurnyChain/Backend/api
        go build -o bin/api ./cmd/api
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Backend recompilado exitosamente${NC}"
        else
            echo -e "${RED}❌ Error al compilar backend${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Backend no compilado${NC}"
    echo "   Compilando..."
    cd /home/deivid/Documentos/TurnyChain/Backend/api
    go build -o bin/api ./cmd/api
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend compilado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error al compilar backend${NC}"
        exit 1
    fi
fi

# Verificar si el backend está corriendo
if pgrep -f "bin/api" > /dev/null || pgrep -f "go run.*main.go" > /dev/null; then
    echo -e "${GREEN}✅ Backend está corriendo${NC}"

    # Verificar si responde en el puerto 8080
    if curl -s http://localhost:8080/api/categories > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend responde en http://localhost:8080${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend no responde en http://localhost:8080${NC}"
        echo "   Verifica que el JWT sea válido o que el endpoint esté accesible"
    fi
else
    echo -e "${RED}❌ Backend NO está corriendo${NC}"
    echo "   Inicia el backend con: cd /home/deivid/Documentos/TurnyChain/Backend/api && ./bin/api"
    exit 1
fi

# =================================================================
# 3. PRUEBAS DE ENDPOINTS
# =================================================================
echo ""
echo "🧪 3. Probando Endpoints..."
echo "-----------------------------------"

# Nota: Estas pruebas requieren un token JWT válido
# Para una prueba completa, primero debes hacer login

echo "Nota: Las siguientes pruebas requieren autenticación JWT"
echo "Si ves error 401, es normal - significa que el endpoint existe pero necesita token"
echo ""

# Test GET /api/categories
echo "Test 1: GET /api/categories"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/categories)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✅ Endpoint existe (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Endpoint no responde correctamente (HTTP $HTTP_CODE)${NC}"
fi

# Test POST /api/categories (sin token, debería dar 401)
echo ""
echo "Test 2: POST /api/categories (sin token)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/categories \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Category"}')
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✅ Endpoint existe y requiere autenticación (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" == "201" ]; then
    echo -e "${GREEN}✅ Endpoint funciona (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  Respuesta inesperada (HTTP $HTTP_CODE)${NC}"
fi

# =================================================================
# 4. VERIFICAR ARCHIVOS DEL CÓDIGO
# =================================================================
echo ""
echo "📄 4. Verificando Archivos del Código..."
echo "-----------------------------------"

FILES=(
    "/home/deivid/Documentos/TurnyChain/Backend/api/internal/domain/category.go"
    "/home/deivid/Documentos/TurnyChain/Backend/api/internal/handler/category_handler.go"
    "/home/deivid/Documentos/TurnyChain/Backend/api/internal/service/category_service.go"
    "/home/deivid/Documentos/TurnyChain/Backend/api/internal/repository/category_repository.go"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $(basename $file)"
    else
        echo -e "${RED}❌${NC} $(basename $file) - NO EXISTE"
    fi
done

# Verificar que category_handler.go tenga StationID en CategoryPayload
if grep -q "StationID.*\*string" /home/deivid/Documentos/TurnyChain/Backend/api/internal/handler/category_handler.go; then
    echo -e "${GREEN}✅ CategoryPayload tiene campo StationID${NC}"
else
    echo -e "${RED}❌ CategoryPayload NO tiene campo StationID${NC}"
fi

# Verificar que category_repository.go tenga INSERT con station_id
if grep -q "INSERT INTO categories.*station_id" /home/deivid/Documentos/TurnyChain/Backend/api/internal/repository/category_repository.go; then
    echo -e "${GREEN}✅ Repository INSERT incluye station_id${NC}"
else
    echo -e "${RED}❌ Repository INSERT NO incluye station_id${NC}"
fi

# =================================================================
# 5. RESUMEN
# =================================================================
echo ""
echo "📊 RESUMEN"
echo "========================================="
echo ""
echo "Si todo está en ✅, el sistema debería funcionar correctamente."
echo ""
echo "Para probar manualmente con cURL (necesitas un token JWT válido):"
echo ""
echo "# 1. Hacer login para obtener token:"
echo "TOKEN=\$(curl -s -X POST http://localhost:8080/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\":\"admin\",\"password\":\"1234\"}' | jq -r '.token')"
echo ""
echo "# 2. Crear categoría:"
echo "curl -X POST http://localhost:8080/api/categories \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -d '{\"name\":\"Nueva Categoria\",\"station_id\":\"e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02\"}'"
echo ""
echo "========================================="

