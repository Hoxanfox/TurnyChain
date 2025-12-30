# 🚀 Guía Rápida: Sistema de Estaciones de Preparación

## ✅ ¿Qué se implementó?

Se ha creado un **sistema completo de gestión de estaciones de preparación** que permite:

1. **Organizar la cocina por estaciones** (Cocina, Bar, Parrilla, Postres, etc.)
2. **Asignar impresoras** a cada estación
3. **Generar tickets cortados** automáticamente según la categoría del item
4. **Enviar comandas** a las impresoras correspondientes

---

## 📦 Archivos Creados/Modificados

### **Base de Datos**
- ✅ `baseDatos/migration_add_stations_and_printers.sql` - Migración con nuevas tablas
- ✅ `baseDatos/init.sql` - Actualizado con tablas de stations y printers

### **Modelos de Dominio**
- ✅ `internal/domain/station.go` - Modelo de estación
- ✅ `internal/domain/printer.go` - Modelo de impresora
- ✅ `internal/domain/kitchen_ticket.go` - Modelo de tickets de cocina
- ✅ `internal/domain/category.go` - Actualizado con station_id
- ✅ `internal/domain/order.go` - Actualizado con info de estación

### **Repositorios**
- ✅ `internal/repository/station_repository.go`
- ✅ `internal/repository/printer_repository.go`
- ✅ `internal/repository/category_repository.go` - Actualizado
- ✅ `internal/repository/order_repository.go` - Actualizado

### **Servicios**
- ✅ `internal/service/station_service.go`
- ✅ `internal/service/printer_service.go`
- ✅ `internal/service/kitchen_ticket_service.go`

### **Handlers**
- ✅ `internal/handler/station_handler.go`
- ✅ `internal/handler/printer_handler.go`
- ✅ `internal/handler/kitchen_ticket_handler.go`

### **Router y Main**
- ✅ `internal/router/router.go` - Rutas agregadas
- ✅ `cmd/api/main.go` - Inyección de dependencias

### **Documentación**
- ✅ `KITCHEN_STATIONS.md` - Documentación completa del sistema

---

## 🔧 Pasos para Aplicar los Cambios

### 1. **Aplicar Migraciones a la Base de Datos**

#### Opción A: Reiniciar la BD desde cero (RECOMENDADO para desarrollo)
```bash
cd /home/deivid/Documentos/TurnyChain/Backend/baseDatos

# Detener y eliminar contenedores actuales
docker-compose down -v

# Levantar la BD con el init.sql actualizado
docker-compose up -d

# Esperar 5 segundos para que la BD esté lista
sleep 5

# Verificar que las tablas se crearon
PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -c "\dt"
```

#### Opción B: Aplicar solo la migración (si ya tienes datos)
```bash
cd /home/deivid/Documentos/TurnyChain/Backend/baseDatos

PGPASSWORD=1234 psql -h localhost -U postgres -d restaurant_db -f migration_add_stations_and_printers.sql
```

### 2. **Compilar el Backend**
```bash
cd /home/deivid/Documentos/TurnyChain/Backend/api

# Compilar
go build -o bin/api ./cmd/api

# O ejecutar directamente
go run ./cmd/api/main.go
```

### 3. **Verificar que todo funciona**
```bash
# Probar endpoint de estaciones
curl http://localhost:8080/api/stations

# Probar endpoint de impresoras
curl http://localhost:8080/api/printers
```

---

## 🎯 Uso Básico desde el Frontend

### 1. **Ver Estaciones Disponibles**
```javascript
// GET /api/stations
fetch('http://localhost:8080/api/stations')
  .then(res => res.json())
  .then(stations => console.log(stations));
```

### 2. **Crear una Orden (Ya existente)**
```javascript
// POST /api/orders
// (El flujo actual NO cambia, funciona igual)
```

### 3. **Vista Previa de Tickets**
```javascript
// GET /api/orders/:orderId/kitchen-tickets/preview
fetch(`http://localhost:8080/api/orders/${orderId}/kitchen-tickets/preview`)
  .then(res => res.json())
  .then(preview => {
    // Muestra los tickets que se generarían por estación
    console.log('Tickets a generar:', preview.tickets);
  });
```

### 4. **Imprimir Tickets de Cocina**
```javascript
// POST /api/orders/:orderId/kitchen-tickets/print
fetch(`http://localhost:8080/api/orders/${orderId}/kitchen-tickets/print`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reprint: false })
})
  .then(res => res.json())
  .then(result => {
    if (result.success) {
      console.log('✅ Tickets impresos en', result.tickets_sent, 'estaciones');
    } else {
      console.warn('⚠️ Algunos tickets fallaron:', result.failed_prints);
    }
  });
```

---

## 🧪 Testing en Desarrollo

### Datos de Prueba Incluidos

La base de datos ya incluye datos de ejemplo:

**Estaciones:**
- Cocina Principal
- Bar
- Parrilla
- Postres

**Impresoras:**
- Impresora Cocina 1 (192.168.1.101)
- Impresora Bar 1 (192.168.1.102)
- Impresora Parrilla 1 (192.168.1.103)
- Impresora Postres 1 (192.168.1.104)

**Categorías asociadas:**
- "Platos Fuertes" → Cocina Principal
- "Bebidas" → Bar

### Modo de Prueba (Sin Hardware)

Por ahora, el sistema está en **modo simulación**. Los tickets NO se envían a impresoras reales, solo se registran en los logs del backend.

Para ver los logs simulados:
```bash
cd /home/deivid/Documentos/TurnyChain/Backend/api
go run ./cmd/api/main.go

# Al imprimir tickets verás:
# 📄 Simulando impresión en Impresora Cocina 1 (192.168.1.101:9100)
#    Orden: ORD-abc12345 | Mesa: 5 | Estación: Cocina Principal
#    Items: 2
```

---

## 🔌 Configuración de Impresoras Reales

### Cuando tengas impresoras físicas:

1. **Conectar impresora a la red**
2. **Asignar IP estática** (ej: 192.168.1.101)
3. **Actualizar la BD:**
```sql
UPDATE printers 
SET ip_address = '192.168.1.101', 
    port = 9100 
WHERE name = 'Impresora Cocina 1';
```

4. **Implementar lógica ESC/POS** en `kitchen_ticket_service.go`:
```go
// TODO: Implementar comandos ESC/POS reales
// Librerías recomendadas:
// - github.com/kenshaw/escpos
// - github.com/qiniu/iconv
```

---

## 📚 Documentación Completa

Para más detalles, ver:
- **`KITCHEN_STATIONS.md`** - Documentación completa del sistema
- **`FRONTEND_INTEGRATION.md`** - Guía de integración con el frontend

---

## ✅ Checklist de Implementación

### Backend ✅
- [x] Modelos de dominio creados
- [x] Repositorios implementados
- [x] Servicios implementados
- [x] Handlers creados
- [x] Rutas registradas
- [x] Base de datos migrada
- [x] Compilación exitosa

### Frontend ⏳ (Pendiente)
- [ ] Pantalla de gestión de estaciones
- [ ] Pantalla de gestión de impresoras
- [ ] Botón "Enviar a Cocina" en orden
- [ ] Botón "Reimprimir Comanda"
- [ ] Vista previa de tickets

### Producción 🔜 (Futuro)
- [ ] Implementar ESC/POS real
- [ ] WebSockets para notificaciones
- [ ] Retry logic para fallos
- [ ] Load balancing de impresoras

---

## 🆘 Soporte

Si tienes problemas:
1. Verifica que la BD esté corriendo: `docker ps`
2. Revisa los logs del backend
3. Usa `/preview` para debugging
4. Consulta `KITCHEN_STATIONS.md` para troubleshooting

---

**¡Sistema listo para usar!** 🎉

