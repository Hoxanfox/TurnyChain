# 🖨️ Corrección de Problemas de Impresión Simultánea

## 🔍 Problema Detectado

El sistema presentaba errores `connection refused` al intentar imprimir múltiples tickets simultáneamente a impresoras térmicas ESC/POS, especialmente cuando varias estaciones compartían la misma dirección IP/puerto.

### Síntomas:
- ✅ Tickets de "Sopas" y "Pique" se imprimían correctamente
- ❌ Ticket de "Caja" fallaba con `connection refused` en la misma IP
- Error ocurría cuando se enviaban 3+ impresiones casi simultáneamente

### Causa Raíz:
Las impresoras térmicas económicas típicamente:
1. Solo aceptan **una conexión TCP a la vez**
2. Necesitan tiempo para liberar el socket después de cada impresión
3. Si se intenta conectar mientras están ocupadas, rechazan la conexión

## ✅ Soluciones Implementadas

### 1. **Mutex por IP** (Sincronización)
Se agregó un sistema de locks (mutex) para garantizar que múltiples tickets a la misma IP se envíen **secuencialmente** en lugar de simultáneamente.

**Archivo**: `internal/service/kitchen_ticket_service.go`
```go
// Nuevo campo en KitchenTicketService
ipLocks      map[string]*sync.Mutex     // Mutex por IP
ipLocksGuard sync.RWMutex               // Protege el mapa

// Método para obtener/crear mutex por IP
func (s *KitchenTicketService) getMutexForIP(ipAddress string) *sync.Mutex
```

### 2. **Delays de Liberación de Socket**
Se agregaron delays estratégicos para dar tiempo a que las impresoras liberen sus recursos:

- **300ms** después de cada impresión exitosa (en `sendToPrinter`)
- **500ms** entre impresión de estaciones y caja (en `PrintOrderAllDestinations`)

### 3. **Sistema de Reintentos Mejorado**
El cliente ESC/POS ahora implementa reintentos automáticos:

**Archivo**: `internal/utils/escpos_printer.go`
```go
retryAttempts: 3                      // 3 intentos
retryDelay:   500 * time.Millisecond  // Espera entre intentos
timeout:      10 * time.Second        // Timeout aumentado
```

### 4. **Logs Mejorados**
Se agregaron logs informativos para tracking del flujo:
- 📄 Inicio de impresión
- ⏱️ Esperando liberación de sockets
- ⚠️ Reintentos de conexión
- ✅ Impresión exitosa

## 🧪 Cómo Probar

### Opción A: Script de Prueba de Red
```bash
# Probar conectividad con la impresora
./test_printer_connection.sh 192.168.1.100 9100
```

### Opción B: Comando netcat directo
```bash
# Verificar si el puerto está abierto
nc -zv 192.168.1.100 9100
```

### Opción C: Test desde Go
Agregar un endpoint de prueba en la API para enviar un ticket de test.

## 📊 Configuración Recomendada

### Caso 1: Una impresora física para todo
✅ **Configuración actual funciona perfecto**
- Las estaciones comparten la misma IP:puerto
- El mutex serializa todas las impresiones
- Los delays previenen colisiones

### Caso 2: Múltiples impresoras físicas
✅ **También funciona**
- Cada estación tiene su propia IP
- Las impresiones son paralelas (sin espera)
- Solo se serializan si comparten IP

**Ejemplo de configuración DB**:
```sql
-- Impresoras separadas
INSERT INTO printers (name, ip_address, port, station_id) VALUES
  ('Impresora Sopas', '192.168.1.101', 9100, 'uuid-sopas'),
  ('Impresora Cocina', '192.168.1.102', 9100, 'uuid-cocina'),
  ('Impresora Caja', '192.168.1.100', 9100, 'uuid-caja');
```

## 🛠️ Troubleshooting

### Si sigue fallando:

1. **Verificar IP/Puerto en DB**
   ```sql
   SELECT name, ip_address, port, is_active FROM printers;
   ```

2. **Probar conectividad**
   ```bash
   ping 192.168.1.100
   nc -zv 192.168.1.100 9100
   ```

3. **Revisar logs del backend**
   ```bash
   # Buscar errores de conexión
   tail -f logs/api.log | grep "imprim"
   ```

4. **Aumentar delays si es necesario**
   - En `sendToPrinter`: aumentar de 300ms a 500ms
   - En `PrintOrderAllDestinations`: aumentar de 500ms a 1000ms

5. **Verificar límite de conexiones de la impresora**
   - Consultar manual del fabricante
   - Algunas impresoras permiten solo 1 conexión simultánea
   - Otras permiten múltiples pero con cola interna

## 🔄 Flujo de Impresión Actual

```
Nueva Orden → PrintOrderAllDestinations()
                ↓
          PrintKitchenTickets()
                ↓
    ┌─────────┴─────────┐
    ↓                   ↓
  Sopas               Cocina
  (mutex IP1)         (mutex IP1)
    ↓                   ↓
  300ms delay         300ms delay
    └─────────┬─────────┘
              ↓
        500ms delay
              ↓
   PrintGlobalOrderTicket()
              ↓
            Caja
          (mutex IP1)
              ↓
          300ms delay
```

## 📝 Archivos Modificados

1. **`internal/service/kitchen_ticket_service.go`**
   - Agregados mutex por IP
   - Delays entre impresiones
   - Logs mejorados

2. **`internal/utils/escpos_printer.go`**
   - Sistema de reintentos
   - Timeout aumentado
   - Mejor manejo de errores

3. **`test_printer_connection.sh`** (nuevo)
   - Script de diagnóstico de conectividad

## ✨ Beneficios

- ✅ **Prevención de colisiones**: Los mutex garantizan acceso serializado
- ✅ **Tolerancia a fallos**: Sistema de reintentos automático
- ✅ **Flexibilidad**: Funciona con 1 o múltiples impresoras
- ✅ **Observabilidad**: Logs detallados para debugging
- ✅ **Performance**: Solo serializa cuando es necesario (misma IP)

## 📚 Referencias

- [ESC/POS Protocol](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [TCP Connection Handling](https://pkg.go.dev/net#Dial)
- [Go Mutex Best Practices](https://go.dev/tour/concurrency/9)

---

**Última actualización**: 2 de Marzo, 2026
**Autor**: Deivid
**Estado**: ✅ Implementado y probado

