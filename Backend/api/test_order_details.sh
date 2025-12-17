#!/bin/bash

# Script de prueba para verificar las mejoras en el detalle de órdenes
# Ejecutar después de iniciar el servidor: ./bin/api

echo "🧪 Tests para Mejoras en Detalle de Órdenes"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables (ajustar según tu entorno)
API_URL="http://localhost:8080"
TOKEN="your_auth_token_here"

echo "${YELLOW}⚠️  NOTA: Actualiza el TOKEN en este script antes de ejecutar${NC}"
echo ""

# Función para hacer peticiones
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo "📝 Test: $description"
    echo "   Endpoint: $method $endpoint"

    if [ -z "$data" ]; then
        response=$(curl -s -X $method "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -X $method "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    echo "   Response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Crear orden con customizaciones completas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ORDER_PAYLOAD='{
  "table_number": 5,
  "items": [{
    "menu_item_id": "550e8400-e29b-41d4-a716-446655440001",
    "quantity": 1,
    "price_at_order": 12.50,
    "notes": "Sin cebolla por favor",
    "customizations": {
      "removed_ingredients": [
        {"id": "550e8400-e29b-41d4-a716-446655440010", "name": "Cebolla"}
      ],
      "selected_accompaniments": [
        {"id": "550e8400-e29b-41d4-a716-446655440020", "name": "Papas fritas"}
      ],
      "all_ingredients": [
        {"id": "550e8400-e29b-41d4-a716-446655440010", "name": "Cebolla"},
        {"id": "550e8400-e29b-41d4-a716-446655440011", "name": "Lechuga"},
        {"id": "550e8400-e29b-41d4-a716-446655440012", "name": "Tomate"},
        {"id": "550e8400-e29b-41d4-a716-446655440013", "name": "Queso"}
      ],
      "all_accompaniments": [
        {"id": "550e8400-e29b-41d4-a716-446655440020", "name": "Papas fritas"},
        {"id": "550e8400-e29b-41d4-a716-446655440021", "name": "Ensalada"}
      ]
    }
  }]
}'

test_endpoint "POST" "/orders" "$ORDER_PAYLOAD" "Crear orden con info completa"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Obtener lista de órdenes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "GET" "/orders" "" "Listar todas las órdenes"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Obtener orden específica"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${YELLOW}⚠️  Reemplaza ORDER_ID con un ID real de la respuesta anterior${NC}"

ORDER_ID="550e8400-e29b-41d4-a716-446655440000"
test_endpoint "GET" "/orders/$ORDER_ID" "" "Obtener detalle de orden"

echo ""
echo "${GREEN}✅ Tests completados${NC}"
echo ""
echo "📋 Verificar que las respuestas incluyan:"
echo "   • all_ingredients: [...] ✓"
echo "   • all_accompaniments: [...] ✓"
echo "   • removed_ingredients: [...] ✓"
echo "   • selected_accompaniments: [...] ✓"
echo ""
echo "🔍 Los campos all_* deben contener la lista COMPLETA"
echo "🔍 Los campos removed_/selected_ solo contienen los cambios"

