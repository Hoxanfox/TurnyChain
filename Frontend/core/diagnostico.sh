#!/bin/bash

# =================================================================
# Script de Diagnóstico: Error 500 en GET /api/orders?my_orders=true
# =================================================================

echo "🔍 Diagnóstico del Error 500"
echo "============================"
echo ""

# Token del mesero (el que estás usando)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjYwNTgwNDUsInJvbGUiOiJtZXNlcm8iLCJzdWIiOiI1MDhhYzRhNi1hNzg1LTQ0OGMtYmJiMS0xZmQ1ZTJlMTI3N2MifQ.i5GOlM2Qey-QKSglk4fWfDjWg6kmusodstDZWspLtv0"

# UUID del mesero (extraído del token)
WAITER_ID="508ac4a6-a785-448c-bbb1-1fd5e2e1277c"

echo "1️⃣ Verificando Token JWT..."
echo "Token: ${TOKEN:0:50}..."
echo "Waiter ID: $WAITER_ID"
echo ""

echo "2️⃣ Decodificando Token JWT..."
# Extraer el payload (segunda parte del token)
PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2)
# Agregar padding si es necesario
PAYLOAD_PADDED=$(echo "$PAYLOAD" | sed 's/-/+/g; s/_/\//g')
case $((${#PAYLOAD_PADDED} % 4)) in
    2) PAYLOAD_PADDED="${PAYLOAD_PADDED}==" ;;
    3) PAYLOAD_PADDED="${PAYLOAD_PADDED}=" ;;
esac
# Decodificar base64
echo "$PAYLOAD_PADDED" | base64 -d 2>/dev/null | jq '.' 2>/dev/null || echo "No se pudo decodificar (jq no instalado)"
echo ""

echo "3️⃣ Probando Petición sin Filtro..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/orders | head -20
echo ""

echo "4️⃣ Probando Petición CON Filtro (my_orders=true)..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/orders?my_orders=true
echo ""

echo "5️⃣ Verificando Backend..."
echo "¿El backend está corriendo?"
curl -s http://localhost:3000/health 2>/dev/null && echo "✅ Backend responde" || echo "❌ Backend no responde"
echo ""

echo "6️⃣ Verificando Base de Datos (requiere psql)..."
if command -v psql &> /dev/null; then
    echo "Órdenes del mesero $WAITER_ID:"
    PGPASSWORD=postgres psql -h localhost -U postgres -d turnychain -c \
    "SELECT id, table_number, waiter_id, status, total FROM orders WHERE waiter_id = '$WAITER_ID' AND deleted_at IS NULL LIMIT 5;" \
    2>/dev/null || echo "❌ No se pudo conectar a la base de datos"
else
    echo "⚠️ psql no instalado, omitiendo verificación de BD"
fi
echo ""

echo "7️⃣ Verificando Logs del Backend..."
echo "Últimas 20 líneas de logs (si están en docker):"
docker logs turnychain-api 2>&1 | tail -20 || echo "❌ No se encontró el contenedor 'turnychain-api'"
echo ""

echo "✅ Diagnóstico completado"
echo ""
echo "📋 Próximos pasos:"
echo "1. Si HTTP Status es 500, revisa los logs del backend"
echo "2. Si HTTP Status es 401, el token expiró o es inválido"
echo "3. Si HTTP Status es 200 pero no trae datos, verifica la BD"
echo "4. Aplica la solución en SOLUCION_ERROR_500.md"

