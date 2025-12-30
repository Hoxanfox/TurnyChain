# 🖨️ Sistema de Impresión - Opciones Completas

## 📊 Resumen de Opciones

Ahora el panel del cajero tiene **3 opciones de impresión** para órdenes pagadas:

```
┌─────────────────────────────────────┐
│ ✓ Pagado Completamente              │
├─────────────────────────────────────┤
│ [📋 Ver Detalle]                    │
├─────────────────────────────────────┤
│  🖨️ OPCIONES DE IMPRESIÓN          │
│                                     │
│  [🎫 Vista Previa Tickets]         │
│                                     │
│  [🏪 Tickets Cocina] [📄 Comanda]  │
│   por Estación        Completa     │
└─────────────────────────────────────┘
```

---

## 🎯 Opciones de Impresión

### 1. 🏪 Tickets por Estación (BACKEND)

**Botón**: "Tickets Cocina"  
**Color**: Púrpura/Rosa  
**Método**: `kitchenTicketsAPI.print(orderId, true)`

#### ¿Qué hace?
- ✅ Envía la orden al **BACKEND**
- ✅ El backend **genera tickets separados** por estación
- ✅ El backend **imprime automáticamente** en las impresoras térmicas configuradas
- ✅ Cada estación recibe solo sus items

#### ¿Cuándo usar?
- ✅ Cuando tienes **impresoras térmicas configuradas** en el servidor
- ✅ Para **flujo de cocina organizado** (cada estación recibe su ticket)
- ✅ Para **producción normal** del restaurante

#### Requisitos Backend:
```
✓ Impresoras térmicas físicas conectadas al servidor
✓ Configuración de impresoras por estación
✓ Software de impresión (escpos, cups, o similar)
✓ Endpoint: POST /api/orders/{id}/kitchen-tickets/print
```

#### Flujo:
```
Frontend → Backend → Procesa orden
                   → Separa por estaciones
                   → Genera tickets
                   → Envía a impresoras físicas
                   → Respuesta con resultado
```

---

### 2. 📄 Comanda Completa (NAVEGADOR)

**Botón**: "Comanda Completa"  
**Color**: Naranja/Rojo  
**Método**: `printKitchenCommand(orderDetails)`

#### ¿Qué hace?
- ✅ Genera HTML de la comanda completa
- ✅ Abre diálogo de impresión del **NAVEGADOR** (window.print)
- ✅ Imprime en la impresora predeterminada del navegador
- ✅ Incluye TODOS los items de la orden juntos

#### ¿Cuándo usar?
- ✅ Para **revisar físicamente** la orden completa
- ✅ Cuando **no tienes impresoras térmicas** configuradas
- ✅ Para **archivo o respaldo** en papel
- ✅ Para **verificación visual** antes de enviar a cocina
- ✅ Como **fallback** si falla el sistema de backend

#### Requisitos:
```
✓ Navegador web con soporte de window.print()
✓ Impresora conectada al ordenador (puede ser PDF)
✓ NO requiere backend especial
```

#### Flujo:
```
Frontend → Genera HTML
        → Abre window.print()
        → Usuario selecciona impresora
        → Imprime localmente
```

---

### 3. 🎫 Vista Previa de Tickets

**Botón**: "Vista Previa Tickets"  
**Color**: Índigo/Púrpura  
**Método**: `kitchenTicketsAPI.preview(orderId)`

#### ¿Qué hace?
- ✅ Muestra un **modal** con la vista previa
- ✅ Lista todos los tickets que se generarán
- ✅ Muestra detalles por estación
- ✅ Permite **imprimir desde la vista previa**

#### ¿Cuándo usar?
- ✅ Para **verificar** antes de imprimir
- ✅ Para **revisar** qué estaciones recibirán tickets
- ✅ Para **confirmar** customizaciones y notas

---

## 🔄 Comparación de Métodos

| Característica | Tickets Cocina (Backend) | Comanda Completa (Navegador) |
|---|---|---|
| **Método** | Backend API | window.print() |
| **Impresión** | Impresoras térmicas del servidor | Impresora del navegador |
| **Separación** | ✅ Por estación | ❌ Todo junto |
| **Automático** | ✅ Sí | ⚠️ Usuario selecciona |
| **Configuración** | ⚠️ Requiere setup backend | ✅ Funciona siempre |
| **Formato** | Tickets 80mm térmicos | A4 o configurado |
| **Uso** | Producción | Revisión/Archivo |
| **Fallback** | → Comanda Completa | N/A |

---

## 📋 ¿Cómo Funciona el Backend?

### Arquitectura de Impresión

```
                    BACKEND
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Estación A     Estación B     Estación C
        │              │              │
   Impresora A    Impresora B    Impresora C
        │              │              │
    [Ticket A]     [Ticket B]     [Ticket C]
```

### Configuración Necesaria en Backend

1. **Impresoras Térmicas**
   - Conectadas físicamente al servidor
   - Configuradas en el sistema operativo
   - Driver instalado

2. **Software de Impresión**
   - ESCPOS (para impresoras térmicas)
   - CUPS (Linux)
   - Windows Print Spooler
   - O librería específica del lenguaje

3. **Configuración de Estaciones**
   - Cada estación tiene una impresora asignada
   - Configurado en la base de datos
   - Ejemplo:
     ```json
     {
       "station_id": "parrilla-01",
       "station_name": "Parrilla",
       "printer_name": "EPSON-TM-T20",
       "printer_ip": "192.168.1.100"
     }
     ```

4. **Endpoint Backend**
   ```
   POST /api/orders/{orderId}/kitchen-tickets/print
   
   Body:
   {
     "order_id": "uuid",
     "reprint": false
   }
   
   Response:
   {
     "success": true,
     "tickets_sent": 3,
     "failed_prints": [],
     "tickets": [...]
   }
   ```

---

## 🎯 Casos de Uso

### Caso 1: Restaurante con Sistema Completo
**Situación**: Tienes impresoras térmicas en cada estación de cocina

**Flujo Normal**:
1. Cajero confirma pago → **Auto-imprime tickets por estación** 🏪
2. Si necesita revisar → **Vista previa** 🎫
3. Si necesita re-imprimir → **Tickets por estación** 🏪
4. Si necesita archivo físico → **Comanda completa** 📄

---

### Caso 2: Restaurante sin Impresoras Configuradas
**Situación**: No tienes impresoras térmicas o están en mantenimiento

**Flujo Normal**:
1. Cajero confirma pago → **Falla backend** → **Auto-fallback a comanda completa** 📄
2. Para cualquier impresión → **Comanda completa** 📄
3. Imprime en PDF o impresora de escritorio

---

### Caso 3: Verificación antes de Cocina
**Situación**: Quieres revisar la orden antes de enviar a cocina

**Flujo Normal**:
1. Cajero recibe orden → **Vista previa tickets** 🎫
2. Verifica items y customizaciones
3. Si está correcto → **Imprimir desde vista previa**
4. Si hay error → Cancela y corrige

---

### Caso 4: Necesitas Respaldo Físico
**Situación**: Quieres tener una copia completa en papel para archivo

**Flujo Normal**:
1. **Tickets por estación** 🏪 (para cocina)
2. **Comanda completa** 📄 (para archivo)
3. Guardas la comanda completa en carpeta de respaldo

---

## 🚨 Manejo de Errores

### Error en Tickets por Estación

**Si falla**:
```
1. Intenta imprimir vía backend
   ❌ Fallo (impresora offline, backend error, etc.)
   
2. Fallback automático a Comanda Completa
   → Abre window.print()
   → Notificación: "Impresión local como respaldo"
   
3. Usuario puede reimprimir manualmente
```

**Notificación**:
```
⚠️ Comanda Re-impresa (Local)
Mesa 5 - Comanda re-impresa localmente.
Los tickets por estación no pudieron enviarse.
```

---

## 🎨 Interfaz Visual

### Desktop - Órdenes Pagadas

```
╔═════════════════════════════════════════╗
║     ✓ Pagado Completamente              ║
╠═════════════════════════════════════════╣
║  [📋 Ver Detalle]                       ║
║                                         ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  🖨️ OPCIONES DE IMPRESIÓN              ║
║                                         ║
║  [🎫 Vista Previa Tickets]   (ancho)   ║
║                                         ║
║  ┌──────────────┬──────────────┐       ║
║  │   🏪 Tickets │  📄 Comanda  │       ║
║  │   por        │  Completa    │       ║
║  │   Estación   │              │       ║
║  └──────────────┴──────────────┘       ║
╚═════════════════════════════════════════╝
```

### Mobile - Mismo Layout

Responsive, se adapta al tamaño de pantalla móvil.

---

## 💡 Recomendaciones

### Para Producción
1. **Usa "Tickets por Estación"** para el flujo normal
2. Configura las impresoras térmicas correctamente
3. Ten "Comanda Completa" como respaldo

### Para Desarrollo/Testing
1. **Usa "Comanda Completa"** si no tienes impresoras
2. Puedes imprimir a PDF para revisar
3. Configura las impresoras más tarde

### Para Archivo
1. **Usa "Comanda Completa"** al final del día
2. Imprime a PDF las órdenes importantes
3. Guarda en carpeta de respaldo

---

## 🔧 Configuración Recomendada

### Backend (Go/Node.js/Python)

**Ejemplo de estructura**:
```go
type PrinterConfig struct {
    StationID   string
    StationName string
    PrinterName string
    PrinterIP   string
    PrinterPort int
}

func PrintKitchenTickets(orderId string) error {
    // 1. Obtener orden
    order := GetOrder(orderId)
    
    // 2. Agrupar items por estación
    ticketsByStation := GroupItemsByStation(order.Items)
    
    // 3. Para cada estación
    for stationId, items := range ticketsByStation {
        // 4. Obtener config de impresora
        printer := GetPrinterConfig(stationId)
        
        // 5. Generar ticket
        ticket := GenerateTicket(order, items, station)
        
        // 6. Enviar a impresora
        err := SendToPrinter(printer, ticket)
        if err != nil {
            log.Error("Failed to print for station", stationId)
        }
    }
}
```

---

## ✅ Resumen

### Lo que tienes ahora:

| Opción | Propósito | Tecnología | Cuándo Usar |
|---|---|---|---|
| 🏪 **Tickets Cocina** | Producción organizada | Backend + Impresoras térmicas | Flujo normal |
| 📄 **Comanda Completa** | Revisión y respaldo | Navegador + window.print | Verificación, archivo |
| 🎫 **Vista Previa** | Verificación | Frontend + Backend API | Antes de imprimir |

### Ventajas:

✅ **Flexibilidad**: Múltiples opciones según necesidad  
✅ **Resiliencia**: Fallback automático si falla backend  
✅ **Organización**: Tickets separados para cada estación  
✅ **Archivo**: Comanda completa para respaldo físico  
✅ **Verificación**: Vista previa antes de imprimir  

---

**Fecha**: 2025-12-26  
**Estado**: ✅ Implementado y funcional

