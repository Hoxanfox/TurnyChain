# Implementación de Impresión ESC/POS

## 📄 Descripción General

Se ha implementado la funcionalidad real de impresión ESC/POS para las impresoras térmicas de cocina. El sistema ahora puede enviar tickets a impresoras físicas conectadas a la red.

## 🚀 Características Implementadas

### 1. Impresión ESC/POS Real
- **Archivo**: `internal/utils/escpos_printer.go`
- Implementación nativa de comandos ESC/POS sin dependencias externas
- Soporte para impresoras térmicas conectadas por red (TCP/IP)
- Formato profesional de tickets de cocina

### 2. Comandos ESC/POS Soportados
- ✅ Inicialización de impresora
- ✅ Alineación (izquierda, centro, derecha)
- ✅ Formato de texto (negrita, doble tamaño)
- ✅ Subrayado
- ✅ Corte de papel (parcial/completo)
- ✅ Avance de línea

### 3. Información en el Ticket
Cada ticket incluye:
- **Encabezado**: Nombre de la estación en grande
- **Información de orden**: Número de orden, mesa, mesero, tipo, hora
- **Items**: 
  - Cantidad y nombre del platillo (en grande)
  - Indicador "PARA LLEVAR" si aplica
  - Ingredientes activos (los que SÍ lleva)
  - Acompañamientos seleccionados
  - Notas especiales del item (subrayadas)
- **Notas especiales**: De la orden completa
- **Corte automático**: Al final del ticket

### 4. Endpoint de Prueba
**Nueva ruta**: `POST /api/printers/:id/test`

Permite probar la conexión con una impresora específica enviando un ticket de prueba.

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Conexión exitosa. Se ha enviado un ticket de prueba."
}
```

**Respuesta con error**:
```json
{
  "success": false,
  "error": "Error al conectar con la impresora: connection refused"
}
```

## 📋 Configuración de Impresoras

### Tipos de Impresora Soportados
1. **escpos**: Impresoras térmicas ESC/POS (✅ Implementado)
2. **pdf**: Generación de PDF (⚠️ Pendiente)
3. **raw**: Envío directo de comandos (⚠️ Pendiente)

### Ejemplo de Configuración
```json
{
  "name": "Impresora Cocina Principal",
  "ip_address": "192.168.1.100",
  "port": 9100,
  "printer_type": "escpos",
  "station_id": "uuid-de-la-estacion",
  "is_active": true
}
```

### Puertos Comunes
- **9100**: Puerto estándar para impresoras de red (HP JetDirect)
- **515**: Puerto LPD (Line Printer Daemon)
- **631**: Puerto IPP (Internet Printing Protocol)

## 🔧 Cómo Usar

### 1. Crear una Impresora
```bash
POST /api/printers
{
  "name": "Impresora Parrilla",
  "ip_address": "192.168.1.100",
  "port": 9100,
  "printer_type": "escpos",
  "station_id": "uuid-de-estacion-parrilla"
}
```

### 2. Probar Conexión
```bash
POST /api/printers/{printer-id}/test
```

### 3. Imprimir Tickets de una Orden
```bash
POST /api/orders/{order-id}/kitchen-tickets/print
{
  "reprint": false
}
```

El sistema automáticamente:
1. Genera los tickets cortados por estación
2. Identifica las impresoras de cada estación
3. Envía el ticket correspondiente a cada impresora
4. Reporta éxitos y fallos

## 🛠️ Solución de Problemas

### Error: "connection refused"
**Causas posibles**:
- La impresora no está encendida
- La dirección IP es incorrecta
- El puerto es incorrecto
- Hay un firewall bloqueando la conexión

**Solución**:
1. Verificar que la impresora esté encendida
2. Hacer ping a la IP de la impresora: `ping 192.168.1.100`
3. Probar telnet al puerto: `telnet 192.168.1.100 9100`
4. Verificar la configuración de red de la impresora

### Error: "i/o timeout"
**Causas posibles**:
- La impresora está ocupada
- Problemas de red
- Timeout muy corto

**Solución**:
- El timeout está configurado en 5 segundos
- Verificar que la red no esté saturada
- Reiniciar la impresora si está bloqueada

### La impresora imprime caracteres extraños
**Causa**: La impresora no soporta comandos ESC/POS estándar

**Solución**:
- Verificar el manual de la impresora
- Algunos modelos tienen modos de emulación que deben activarse
- Considerar usar el tipo "raw" con comandos específicos del fabricante

## 📊 Flujo de Impresión

```
1. Cliente crea orden
        ↓
2. Backend registra orden en BD
        ↓
3. POST /orders/{id}/kitchen-tickets/print
        ↓
4. Sistema agrupa items por estación
        ↓
5. Para cada estación:
   - Obtiene impresora(s) asignada(s)
   - Genera ticket ESC/POS
   - Envía vía TCP/IP
        ↓
6. Retorna resultado (éxitos/fallos)
```

## 🔐 Seguridad

- Todas las rutas requieren autenticación JWT
- Solo usuarios autorizados pueden imprimir tickets
- Las conexiones TCP tienen timeout de 5 segundos
- Se registran todos los intentos de impresión en logs

## 📝 Ejemplo de Ticket Impreso

```
        PARRILLA
        ========

ORDEN: ORD-abc12345
Mesa: 5
Mesero: Juan Pérez
Tipo: mesa
Hora: 14:35:20
------------------------------------------
ITEMS:

2x HAMBURGUESA ESPECIAL
   CON: Carne, Queso, Lechuga, Tomate
   ACOMP: Papas Fritas
   
1x COSTILLAS BBQ
   >>> PARA LLEVAR <<<
   NOTA: Sin salsa picante
   
==========================================
```

## 🚀 Próximos Pasos

### Mejoras Planificadas
1. **Impresión PDF**: Para órdenes digitales o backup
2. **Reintentos automáticos**: En caso de fallos temporales
3. **Cola de impresión**: Para manejar múltiples órdenes simultáneas
4. **Impresoras de backup**: Failover automático
5. **Estadísticas de impresión**: Tracking de fallos y tiempos
6. **Soporte para códigos QR**: En los tickets
7. **Configuración de formato**: Por estación (tamaño de fuente, etc.)

## 📞 Soporte

Para problemas o preguntas sobre la implementación:
- Revisar los logs del servidor
- Probar conexión con endpoint `/printers/{id}/test`
- Verificar configuración de red de las impresoras
- Consultar manual del fabricante de la impresora

---

**Fecha de implementación**: Enero 9, 2026
**Versión**: 1.0.0

