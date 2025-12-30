# 🎫 Sistema de Tickets de Cocina por Estación - Panel del Cajero

## 📋 Resumen de Implementación

Se ha mejorado el sistema de impresión de tickets en el panel del cajero para que ahora:

1. **Imprime tickets separados por estación de cocina** automáticamente cuando se confirma un pago
2. **Permite re-imprimir tickets** de órdenes ya pagadas
3. **Incluye vista previa de tickets** antes de imprimir
4. **Tiene fallback a impresión local** si falla la impresión por estaciones

---

## ✨ Nuevas Funcionalidades

### 1. Impresión Automática de Tickets por Estación

**Cuándo se activa**: Al confirmar un pago (cambiar estado a "pagado")

**Qué hace**:
- Envía la orden al backend mediante `kitchenTicketsAPI.print(orderId, false)`
- El backend genera tickets separados para cada estación de cocina
- Cada estación recibe solo los items que le corresponden
- Se envían automáticamente a las impresoras configuradas

**Flujo**:
```
Usuario confirma pago → 
  → Backend genera tickets por estación →
    → Envía a impresoras de cada estación →
      → Notificación de éxito/error
```

### 2. Re-impresión de Tickets

**Cuándo se activa**: Al hacer clic en "Re-imprimir Tickets" en una orden pagada

**Qué hace**:
- Llama a `kitchenTicketsAPI.print(orderId, true)` con flag de reimpresión
- Genera nuevamente los tickets para todas las estaciones
- Útil cuando se necesita una copia adicional

### 3. Vista Previa de Tickets

**Cuándo se activa**: Al hacer clic en "Ver Tickets" en una orden pagada

**Qué muestra**:
- Lista de todos los tickets que se generarán
- Para cada ticket:
  - Estación de cocina
  - Items con cantidades
  - Customizaciones (ingredientes, acompañamientos)
  - Notas especiales
  - Indicador de "Para Llevar" si aplica

**Componente**: `KitchenTicketsPreviewModal`

### 4. Sistema de Fallback

Si la impresión por estaciones falla:
1. Intenta imprimir usando el método local (`printKitchenCommand`)
2. Imprime la comanda completa en el navegador
3. Notifica al usuario que debe imprimirse manualmente

---

## 📁 Archivos Modificados

### Componentes Principales

1. **`CashierDashboard.tsx`**
   - ✅ Integración de `kitchenTicketsAPI`
   - ✅ Mejoras en `handleConfirmPayment`: impresión automática por estaciones
   - ✅ Mejoras en `handlePrintCommand`: re-impresión con fallback
   - ✅ Handler para vista previa: `handlePreviewTickets`
   - ✅ Estado para modal de vista previa

2. **`CashierDashboardDesktop.tsx`**
   - ✅ Prop `onPreviewTickets` agregado
   - ✅ Pasa el handler al `OrdersPanel`

3. **`CashierDashboardMobile.tsx`**
   - ✅ Prop `onPreviewTickets` agregado
   - ✅ Pasa el handler al `TableOrdersModal`

### Componentes de UI

4. **`OrdersPanel.tsx`**
   - ✅ Botón "Ver Tickets" agregado para órdenes pagadas
   - ✅ Botón "Re-imprimir Tickets" mejorado
   - ✅ Layout de 1 columna para acomodar 3 botones

5. **`TableOrdersModal.tsx`**
   - ✅ Botón "Ver Tickets" agregado para móviles
   - ✅ Botón "Re-imprimir" mejorado
   - ✅ Layout de 1 columna para acomodar 3 botones

### Nuevos Componentes

6. **`KitchenTicketsPreviewModal.tsx`** ⭐ NUEVO
   - Modal completo para previsualizar tickets
   - Carga tickets mediante `kitchenTicketsAPI.preview(orderId)`
   - Muestra información detallada de cada ticket
   - Permite imprimir desde la vista previa

---

## 🔄 Flujos de Usuario

### Flujo 1: Confirmar Pago (Automático)

```
1. Cajero ve orden "Por Verificar"
2. Hace clic en "Verificar Comprobante"
3. Revisa la imagen del comprobante
4. Hace clic en "✓ Confirmar"
5. Sistema:
   ✅ Cambia estado a "pagado"
   ✅ Genera tickets por estación automáticamente
   ✅ Envía a impresoras de cocina
   ✅ Muestra notificación de éxito
```

### Flujo 2: Re-imprimir Tickets

```
1. Cajero ve orden "Pagado"
2. Hace clic en "🖨️ Re-imprimir Tickets"
3. Sistema:
   ✅ Re-genera tickets por estación
   ✅ Envía a impresoras
   ✅ Muestra notificación
```

### Flujo 3: Vista Previa

```
1. Cajero ve orden "Pagado"
2. Hace clic en "🎫 Ver Tickets"
3. Se abre modal con vista previa
4. Cajero revisa:
   - Qué estaciones recibirán tickets
   - Qué items tiene cada estación
   - Customizaciones y notas
5. Opciones:
   a) Cerrar (cancelar)
   b) Imprimir desde la vista previa
```

---

## 🎨 Interfaz de Usuario

### Órdenes Pagadas - Botones Disponibles

**Desktop y Mobile**:
- 📋 **Ver Detalle**: Abre modal con todos los detalles de la orden
- 🎫 **Ver Tickets**: Abre vista previa de tickets por estación
- 🖨️ **Re-imprimir Tickets**: Re-imprime todos los tickets

### Vista Previa de Tickets

**Header**:
- Título: "🎫 Vista Previa - Tickets de Cocina"
- Botón de cerrar (✕)

**Contenido**:
- Info general: ID de orden, número de tickets
- Para cada ticket:
  - 🍳 Nombre de la estación
  - Mesa y mesero
  - Lista de items con:
    - Cantidad
    - Nombre del item
    - 🥡 Badge si es "Para Llevar"
    - 🥗 Ingredientes activos
    - 🍟 Acompañamientos
    - 📝 Notas del item
  - ⚠️ Notas especiales de la orden
  - Tipo de orden (Mesa/Llevar/Domicilio)

**Footer**:
- Botón "Cancelar"
- Botón "🖨️ Imprimir Tickets"

---

## 🔧 API Utilizada

### `kitchenTicketsAPI.preview(orderId)`
**Endpoint**: `GET /api/orders/{orderId}/kitchen-tickets/preview`

**Respuesta**:
```typescript
{
  order_id: string;
  tickets: [
    {
      order_id: string;
      order_number: string;
      table_number: number;
      waiter_name: string;
      station_id: string;
      station_name: string;
      items: [...];
      created_at: string;
      order_type: string;
      special_notes?: string;
    }
  ];
}
```

### `kitchenTicketsAPI.print(orderId, reprint)`
**Endpoint**: `POST /api/orders/{orderId}/kitchen-tickets/print`

**Body**:
```json
{
  "order_id": "uuid",
  "reprint": true/false
}
```

**Respuesta**:
```typescript
{
  success: boolean;
  message: string;
  tickets_sent: number;
  failed_prints: [
    {
      station_name: string;
      printer_name: string;
      error: string;
    }
  ];
  tickets: [...];
}
```

---

## 🚨 Manejo de Errores

### Escenarios Cubiertos

1. **Tickets enviados correctamente**
   - ✅ Notificación verde de éxito
   - Mensaje: "X ticket(s) de cocina enviados correctamente"

2. **Algunos tickets fallaron**
   - ⚠️ Notificación amarilla de advertencia
   - Mensaje incluye qué estaciones fallaron
   - Sugiere revisar las impresoras

3. **Todos los tickets fallaron**
   - Intenta impresión local como fallback
   - Si funciona: ⚠️ Notificación que se imprimió localmente
   - Si falla: ⚠️ Notificación de impresión manual necesaria

4. **Error al confirmar pago**
   - ❌ Notificación roja de error
   - Mensaje: "No se pudo confirmar el pago"

5. **Error al cargar vista previa**
   - Muestra mensaje en el modal
   - "No se pudo cargar la vista previa de los tickets"

---

## 🎯 Beneficios

### Para el Cajero
- ✅ **Automático**: No necesita imprimir manualmente
- ✅ **Vista previa**: Puede verificar antes de imprimir
- ✅ **Re-impresión fácil**: Un clic para reimprimir
- ✅ **Feedback claro**: Notificaciones informativas

### Para la Cocina
- ✅ **Organización**: Cada estación recibe solo sus items
- ✅ **Claridad**: Tickets específicos para cada estación
- ✅ **Eficiencia**: No hay confusión sobre qué preparar

### Para el Restaurante
- ✅ **Workflow mejorado**: Proceso automatizado
- ✅ **Menos errores**: Items correctos a cada estación
- ✅ **Trazabilidad**: Historial de impresiones
- ✅ **Flexibilidad**: Fallback si falla el sistema

---

## 📝 Notas Técnicas

### Dependencias
- `kitchenTicketsAPI` de `features/shared/orders/api/kitchenTicketsAPI.ts`
- `printKitchenCommand` de `utils/printUtils.ts` (fallback)
- Tipos de `types/kitchen_tickets.ts`

### Estado
- Modal controlado por: `isTicketsPreviewOpen` y `selectedOrderIdForPreview`
- Preview cargado en el modal mediante `useState` local

### Props Propagados
```
CashierDashboard 
  → CashierDashboardDesktop 
    → OrdersPanel
  → CashierDashboardMobile 
    → TableOrdersModal
```

Todos reciben `onPreviewTickets` y `onPrintCommand`

---

## 🧪 Pruebas Recomendadas

1. **Confirmar pago de orden simple**
   - Verificar que se impriman tickets por estación
   - Verificar notificación de éxito

2. **Confirmar pago con múltiples estaciones**
   - Verificar que cada estación reciba su ticket
   - Verificar contador de tickets enviados

3. **Re-imprimir orden existente**
   - Verificar que se reenvíen todos los tickets
   - Verificar flag de reimpresión

4. **Vista previa de tickets**
   - Abrir modal de vista previa
   - Verificar que muestre todos los tickets
   - Verificar detalles de customizaciones

5. **Manejo de errores**
   - Simular fallo de impresora
   - Verificar fallback a impresión local
   - Verificar notificaciones apropiadas

---

## 🔮 Futuras Mejoras

1. **Historial de impresiones**: Registrar cuándo se imprimió cada ticket
2. **Selección selectiva**: Reimprimir solo tickets de ciertas estaciones
3. **Configuración por estación**: Copias múltiples por estación
4. **Notificaciones en tiempo real**: WebSocket para estado de impresoras
5. **Dashboard de impresoras**: Monitor de estado de impresoras

---

## ✅ Checklist de Implementación

- [x] Integrar `kitchenTicketsAPI` en `CashierDashboard`
- [x] Mejorar `handleConfirmPayment` con impresión automática
- [x] Mejorar `handlePrintCommand` con sistema de fallback
- [x] Crear `KitchenTicketsPreviewModal` component
- [x] Agregar handler `handlePreviewTickets`
- [x] Actualizar `OrdersPanel` con nuevos botones
- [x] Actualizar `TableOrdersModal` para móviles
- [x] Propagar props a componentes Desktop y Mobile
- [x] Manejar errores y notificaciones
- [x] Arreglar warnings de TypeScript/ESLint
- [x] Documentar cambios

---

**Fecha de implementación**: 2025-12-26  
**Versión**: 1.0.0  
**Estado**: ✅ Completado y listo para pruebas

