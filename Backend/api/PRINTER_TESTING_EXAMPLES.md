# 🧪 Ejemplos de Testing de Impresoras

## Requisitos Previos

1. Tener el servidor corriendo: `./bin/api`
2. Tener un token JWT válido
3. Conocer la IP y puerto de tu impresora

## 🔑 Obtener Token JWT

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "tu_password"
  }'

# Respuesta (guardar el token)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Guardar token en variable
export TOKEN="tu_token_jwt"
```

## 📝 Gestión de Impresoras

### 1. Listar Todas las Impresoras

```bash
curl -X GET http://localhost:8080/api/printers \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Crear una Nueva Impresora

```bash
curl -X POST http://localhost:8080/api/printers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Impresora Parrilla Principal",
    "ip_address": "192.168.1.100",
    "port": 9100,
    "printer_type": "escpos",
    "station_id": "uuid-de-tu-estacion-parrilla"
  }'
```

### 3. Obtener Impresoras de una Estación

```bash
# Reemplazar {station-id} con el UUID de tu estación
curl -X GET http://localhost:8080/api/stations/{station-id}/printers \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Actualizar una Impresora

```bash
curl -X PUT http://localhost:8080/api/printers/{printer-id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ip_address": "192.168.1.101",
    "is_active": true
  }'
```

### 5. Eliminar una Impresora

```bash
curl -X DELETE http://localhost:8080/api/printers/{printer-id} \
  -H "Authorization: Bearer $TOKEN"
```

## 🧪 Probar Conexión de Impresora

### Método 1: API Endpoint

```bash
# Probar una impresora específica
curl -X POST http://localhost:8080/api/printers/{printer-id}/test \
  -H "Authorization: Bearer $TOKEN"

# Respuesta exitosa
{
  "success": true,
  "message": "Conexión exitosa. Se ha enviado un ticket de prueba."
}

# Respuesta con error
{
  "success": false,
  "error": "Error al conectar con la impresora: dial tcp 192.168.1.100:9100: connect: connection refused"
}
```

### Método 2: Script Bash

```bash
# Desde la terminal, sin necesidad de API corriendo
./test_printer.sh 192.168.1.100 9100

# Salida esperada:
========================================
🖨️  Test de Conexión de Impresora ESC/POS
========================================

IP:    192.168.1.100
Puerto: 9100

📡 Verificando conectividad de red...
✅ Ping exitoso

🔌 Verificando puerto 9100...
✅ Puerto accesible

📄 Enviando ticket de prueba...
✅ Ticket enviado exitosamente

🎉 La impresora debería estar imprimiendo ahora!
```

## 🍔 Imprimir Tickets de Cocina

### Vista Previa de Tickets (sin imprimir)

```bash
curl -X GET http://localhost:8080/api/orders/{order-id}/kitchen-tickets/preview \
  -H "Authorization: Bearer $TOKEN"

# Respuesta
{
  "order_id": "uuid-de-la-orden",
  "tickets": [
    {
      "order_id": "uuid-de-la-orden",
      "order_number": "ORD-abc12345",
      "table_number": 5,
      "waiter_name": "Juan Pérez",
      "station_id": "uuid-estacion-parrilla",
      "station_name": "PARRILLA",
      "items": [
        {
          "menu_item_name": "HAMBURGUESA ESPECIAL",
          "quantity": 2,
          "customizations": {
            "active_ingredients": [...],
            "selected_accompaniments": [...]
          },
          "is_takeout": false
        }
      ],
      "created_at": "2026-01-09T14:35:20Z",
      "order_type": "mesa"
    }
  ]
}
```

### Imprimir Tickets Reales

```bash
curl -X POST http://localhost:8080/api/orders/{order-id}/kitchen-tickets/print \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reprint": false
  }'

# Respuesta exitosa
{
  "success": true,
  "message": "Tickets impresos correctamente en 3 estaciones",
  "tickets_sent": 3,
  "failed_prints": [],
  "tickets": [...]
}

# Respuesta con algunos fallos
{
  "success": false,
  "message": "Impresión completada con errores: 2 exitosos, 1 fallidos",
  "tickets_sent": 2,
  "failed_prints": [
    {
      "station_name": "POSTRES",
      "printer_name": "Impresora Postres",
      "error": "dial tcp 192.168.1.102:9100: connect: connection refused"
    }
  ],
  "tickets": [...]
}
```

### Reimprimir Tickets

```bash
# Para reimprimir una orden (ej: si se perdió el ticket)
curl -X POST http://localhost:8080/api/orders/{order-id}/kitchen-tickets/print \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reprint": true
  }'
```

## 🔍 Diagnóstico de Problemas

### Verificar Estaciones

```bash
# Listar todas las estaciones
curl -X GET http://localhost:8080/api/stations \
  -H "Authorization: Bearer $TOKEN"

# Ver estaciones activas
curl -X GET http://localhost:8080/api/stations/active \
  -H "Authorization: Bearer $TOKEN"
```

### Verificar Categorías y sus Estaciones

```bash
curl -X GET http://localhost:8080/api/categories \
  -H "Authorization: Bearer $TOKEN"

# Cada categoría debe tener un station_id asignado
```

### Ver Detalles de una Orden

```bash
curl -X GET http://localhost:8080/api/orders/{order-id} \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 Flujo Completo de Testing

```bash
#!/bin/bash
# Script completo de testing

# 1. Login y obtener token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 2. Crear estación de prueba
STATION_ID=$(curl -s -X POST http://localhost:8080/api/stations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ESTACION TEST",
    "description": "Para testing",
    "is_active": true
  }' | jq -r '.id')

echo "Estación creada: $STATION_ID"

# 3. Crear impresora
PRINTER_ID=$(curl -s -X POST http://localhost:8080/api/printers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Impresora Test\",
    \"ip_address\": \"192.168.1.100\",
    \"port\": 9100,
    \"printer_type\": \"escpos\",
    \"station_id\": \"$STATION_ID\"
  }" | jq -r '.id')

echo "Impresora creada: $PRINTER_ID"

# 4. Probar conexión
curl -X POST "http://localhost:8080/api/printers/$PRINTER_ID/test" \
  -H "Authorization: Bearer $TOKEN"

# 5. Crear orden de prueba (necesitas IDs válidos de items)
ORDER_ID=$(curl -s -X POST http://localhost:8080/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "waiter_id": "tu-waiter-id",
    "table_id": "tu-table-id",
    "order_type": "mesa",
    "items": [...]
  }' | jq -r '.id')

echo "Orden creada: $ORDER_ID"

# 6. Vista previa de tickets
curl -X GET "http://localhost:8080/api/orders/$ORDER_ID/kitchen-tickets/preview" \
  -H "Authorization: Bearer $TOKEN" | jq

# 7. Imprimir tickets
curl -X POST "http://localhost:8080/api/orders/$ORDER_ID/kitchen-tickets/print" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reprint": false}' | jq
```

## 🐛 Errores Comunes

### Error: "connection refused"
```json
{
  "success": false,
  "error": "dial tcp 192.168.1.100:9100: connect: connection refused"
}
```

**Solución**: 
1. Verificar que la IP sea correcta
2. Probar con `./test_printer.sh 192.168.1.100 9100`
3. Verificar que la impresora esté encendida

### Error: "i/o timeout"
```json
{
  "success": false,
  "error": "dial tcp 192.168.1.100:9100: i/o timeout"
}
```

**Solución**: 
1. Verificar que la impresora esté en la misma red
2. Verificar firewall
3. Hacer ping a la impresora

### Error: "No hay impresoras configuradas"
```json
{
  "success": true,
  "message": "Impresión completada con errores: 0 exitosos, 1 fallidos",
  "failed_prints": [
    {
      "station_name": "PARRILLA",
      "printer_name": "N/A",
      "error": "No hay impresoras configuradas para esta estación"
    }
  ]
}
```

**Solución**: Crear una impresora para esa estación

## 🎯 Tips

1. **Usa jq para formatear JSON**: Instala `jq` para mejor visualización
2. **Guarda el token**: Exporta el token como variable de entorno
3. **Logs del servidor**: Revisa la consola del API para ver detalles
4. **Test incremental**: Primero prueba conexión, luego imprime
5. **Backup de configuración**: Exporta tu configuración de impresoras

---

**Nota**: Reemplaza los UUIDs de ejemplo con los reales de tu base de datos.

