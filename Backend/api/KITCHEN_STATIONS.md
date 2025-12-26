# Sistema de Estaciones de Preparación y Tickets de Cocina

## 📋 Resumen

Se ha implementado un **sistema completo de gestión de estaciones de preparación** que permite:
- Organizar la cocina por estaciones (Cocina, Bar, Parrilla, Postres, etc.)
- Enviar tickets cortados automáticamente según la categoría del item
- Configurar impresoras para cada estación
- Generar y enviar comandas de forma automática o manual

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  (Crea orden con items de diferentes categorías)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND - API                           │
│  • Recibe orden                                              │
│  • Agrupa items por estación según categoría                │
│  • Genera tickets cortados                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ Estación│      │ Estación│      │ Estación│
    │  Cocina │      │   Bar   │      │ Parrilla│
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                │
         ▼                ▼                ▼
    [Impresora]      [Impresora]      [Impresora]
    192.168.1.101    192.168.1.102    192.168.1.103
```

---

## 📊 Estructura de Base de Datos

### Nueva Tabla: `stations`
```sql
CREATE TABLE "stations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);
```

### Nueva Tabla: `printers`
```sql
CREATE TABLE "printers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) UNIQUE NOT NULL,
  "ip_address" varchar(45) NOT NULL,
  "port" integer NOT NULL DEFAULT 9100,
  "printer_type" varchar(20) NOT NULL DEFAULT 'escpos',
  "station_id" uuid NOT NULL REFERENCES "stations"("id"),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);
```

### Modificación: Tabla `categories`
```sql
ALTER TABLE "categories" ADD COLUMN "station_id" uuid REFERENCES "stations"("id");
```

### Datos de Ejemplo (Seed)
```sql
-- Estaciones
INSERT INTO stations (id, name, description) VALUES
('e01...', 'Cocina Principal', 'Preparación de platos principales'),
('e02...', 'Bar', 'Bebidas alcohólicas y no alcohólicas'),
('e03...', 'Parrilla', 'Carnes a la parrilla'),
('e04...', 'Postres', 'Postres y dulces');

-- Impresoras
INSERT INTO printers (name, ip_address, port, printer_type, station_id) VALUES
('Impresora Cocina 1', '192.168.1.101', 9100, 'escpos', 'e01...'),
('Impresora Bar 1', '192.168.1.102', 9100, 'escpos', 'e02...'),
-- ...

-- Asociar categorías con estaciones
UPDATE categories SET station_id = 'e01...' WHERE name = 'Platos Fuertes';
UPDATE categories SET station_id = 'e02...' WHERE name = 'Bebidas';
```

---

## 🔌 Endpoints de la API

### **Estaciones (Stations)**

#### `GET /api/stations`
Obtiene todas las estaciones.

**Respuesta:**
```json
[
  {
    "id": "e01e6f2b-2250-4630-8a2e-8a3d2a1f9d01",
    "name": "Cocina Principal",
    "description": "Preparación de platos principales y entradas",
    "is_active": true,
    "created_at": "2025-12-25T10:00:00Z"
  }
]
```

#### `GET /api/stations/active`
Obtiene solo las estaciones activas.

#### `GET /api/stations/:id`
Obtiene una estación específica por ID.

#### `POST /api/stations`
Crea una nueva estación.

**Body:**
```json
{
  "name": "Estación Nueva",
  "description": "Descripción opcional"
}
```

#### `PUT /api/stations/:id`
Actualiza una estación.

**Body:**
```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "is_active": false
}
```

#### `DELETE /api/stations/:id`
Desactiva una estación (soft delete).

---

### **Impresoras (Printers)**

#### `GET /api/printers`
Obtiene todas las impresoras con información de su estación.

**Respuesta:**
```json
[
  {
    "id": "p01e6f2b-2250-4630-8a2e-8a3d2a1f9e01",
    "name": "Impresora Cocina 1",
    "ip_address": "192.168.1.101",
    "port": 9100,
    "printer_type": "escpos",
    "station_id": "e01e6f2b-2250-4630-8a2e-8a3d2a1f9d01",
    "station_name": "Cocina Principal",
    "is_active": true,
    "created_at": "2025-12-25T10:00:00Z"
  }
]
```

#### `GET /api/printers/active`
Obtiene solo las impresoras activas.

#### `GET /api/stations/:stationId/printers`
Obtiene todas las impresoras de una estación específica.

#### `POST /api/printers`
Crea una nueva impresora.

**Body:**
```json
{
  "name": "Impresora Bar 2",
  "ip_address": "192.168.1.105",
  "port": 9100,
  "printer_type": "escpos",
  "station_id": "e02e6f2b-2250-4630-8a2e-8a3d2a1f9d02"
}
```

**Tipos de impresora soportados:**
- `escpos` - Impresoras térmicas ESC/POS (más común)
- `pdf` - Generar PDF (para pruebas)
- `raw` - Envío directo de comandos raw

#### `PUT /api/printers/:id`
Actualiza una impresora.

#### `DELETE /api/printers/:id`
Desactiva una impresora (soft delete).

---

### **Tickets de Cocina (Kitchen Tickets)**

#### `GET /api/orders/:orderId/kitchen-tickets/preview`
Obtiene una vista previa de los tickets que se generarían para una orden (sin imprimir).

**Respuesta:**
```json
{
  "order_id": "abc-123-def",
  "tickets": [
    {
      "order_id": "abc-123-def",
      "order_number": "ORD-abc123",
      "table_number": 5,
      "waiter_name": "Juan Pérez",
      "station_id": "e01...",
      "station_name": "Cocina Principal",
      "items": [
        {
          "menu_item_name": "Hamburguesa Clásica",
          "quantity": 2,
          "notes": "Sin cebolla",
          "customizations": {
            "active_ingredients": [...],
            "selected_accompaniments": [...]
          },
          "is_takeout": false
        }
      ],
      "created_at": "2025-12-25T15:30:00Z",
      "order_type": "mesa",
      "special_notes": ""
    },
    {
      "station_name": "Bar",
      "items": [...]
    }
  ]
}
```

#### `POST /api/orders/:orderId/kitchen-tickets/print`
Genera e imprime los tickets de cocina para una orden.

**Body (opcional):**
```json
{
  "order_id": "abc-123-def",
  "reprint": false
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Tickets impresos correctamente en 3 estaciones",
  "tickets_sent": 3,
  "failed_prints": [],
  "tickets": [...]
}
```

**Respuesta con errores parciales (207 Multi-Status):**
```json
{
  "success": false,
  "message": "Impresión completada con errores: 2 exitosos, 1 fallidos",
  "tickets_sent": 2,
  "failed_prints": [
    {
      "station_name": "Bar",
      "printer_name": "Impresora Bar 1",
      "error": "Connection timeout"
    }
  ],
  "tickets": [...]
}
```

---

## 🔄 Flujo de Trabajo

### 1. **Configuración Inicial** (Una sola vez)
```bash
# Crear estaciones
POST /api/stations
{
  "name": "Cocina Principal",
  "description": "Platos principales y entradas"
}

# Crear impresoras para cada estación
POST /api/printers
{
  "name": "Impresora Cocina 1",
  "ip_address": "192.168.1.101",
  "port": 9100,
  "printer_type": "escpos",
  "station_id": "<station_id>"
}

# Asociar categorías con estaciones
PUT /api/categories/:id
{
  "station_id": "<station_id>"
}
```

### 2. **Creación de Orden** (Operación normal)
```bash
# El mesero crea una orden con items variados
POST /api/orders
{
  "table_id": "...",
  "items": [
    { "menu_item_id": "hamburguesa_id", "quantity": 2 },  # Categoría: Platos Fuertes → Cocina
    { "menu_item_id": "gaseosa_id", "quantity": 2 },      # Categoría: Bebidas → Bar
    { "menu_item_id": "asado_id", "quantity": 1 }         # Categoría: Carnes → Parrilla
  ]
}
```

### 3. **Impresión Automática** (Después de crear la orden)
```bash
# El backend automáticamente genera y envía tickets
POST /api/orders/:orderId/kitchen-tickets/print

# Resultado:
# ✅ Ticket enviado a Impresora Cocina 1 (Cocina Principal)
# ✅ Ticket enviado a Impresora Bar 1 (Bar)
# ✅ Ticket enviado a Impresora Parrilla 1 (Parrilla)
```

### 4. **Reimpresión** (Si el papel se atascó)
```bash
POST /api/orders/:orderId/kitchen-tickets/print
{
  "reprint": true
}
```

---

## 🎯 Beneficios del Sistema

### Para la Operación
- ✅ **Organización**: Cada estación solo recibe sus items
- ✅ **Eficiencia**: No hay confusión sobre qué preparar
- ✅ **Trazabilidad**: Se sabe exactamente qué se envió a cada estación
- ✅ **Flexibilidad**: Fácil agregar/quitar estaciones e impresoras

### Para el Desarrollo
- ✅ **Escalable**: Soporta múltiples impresoras por estación (backup/load balancing)
- ✅ **Modular**: Fácil agregar nuevos tipos de impresoras
- ✅ **Robusto**: Manejo de errores por estación (falla parcial no detiene todo)
- ✅ **Testeable**: Vista previa sin imprimir

---

## 🔧 Configuración de Impresoras

### Impresoras Térmicas ESC/POS
Las impresoras térmicas ESC/POS son las más comunes en restaurantes.

**Configuración de Red:**
1. Conectar la impresora a la red local
2. Asignar IP estática (recomendado)
3. Verificar que el puerto 9100 esté abierto
4. Probar conexión: `telnet 192.168.1.101 9100`

**En la base de datos:**
```sql
INSERT INTO printers (name, ip_address, port, printer_type, station_id) 
VALUES ('Impresora Cocina 1', '192.168.1.101', 9100, 'escpos', '<station_id>');
```

### Modo de Prueba (PDF)
Para testing sin hardware:
```sql
UPDATE printers SET printer_type = 'pdf' WHERE id = '<printer_id>';
```

---

## 📝 Ejemplo de Ticket Generado

```
================================
    ORDEN #ORD-abc12345
================================
Mesa: 5
Mesero: Juan Pérez
Tipo: Para comer aquí
Hora: 15:30:25
================================

>>> COCINA PRINCIPAL <<<

---------------------------------
2x Hamburguesa Clásica
   SIN: Cebolla
   CON: Papa, Ensalada
   
---------------------------------
1x Ensalada César
   CON: Extra Pollo
   
================================
```

---

## 🚀 Próximas Mejoras

1. **Implementación Real ESC/POS**: Conectar con impresoras físicas
2. **WebSockets**: Notificaciones en tiempo real cuando se imprimen tickets
3. **Retry Logic**: Reintentar impresión automáticamente si falla
4. **Load Balancing**: Distribuir entre múltiples impresoras
5. **Histórico**: Guardar registro de tickets enviados
6. **Templates**: Personalizar formato de tickets por estación

---

## 🐛 Solución de Problemas

### La impresora no responde
- Verificar que la IP y puerto sean correctos
- Verificar conectividad: `ping 192.168.1.101`
- Verificar que la impresora esté encendida y en red
- Revisar logs del backend

### No se generan tickets
- Verificar que las categorías tengan `station_id` asignado
- Verificar que las estaciones tengan impresoras activas
- Usar `/preview` para debug

### Faltan items en el ticket
- Verificar que todos los items tengan categoría
- Verificar que la categoría tenga `station_id`

---

**Última actualización:** 25 de diciembre de 2025  
**Versión:** 1.0.0

