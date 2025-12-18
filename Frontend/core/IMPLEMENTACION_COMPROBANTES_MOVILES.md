# 📱 Guía de Implementación: Comprobantes de Pago Móviles

## ✅ Implementación Completada

Se ha integrado el sistema completo de manejo de comprobantes de pago con soporte optimizado para dispositivos móviles.

---

## 🎯 Características Implementadas

### 1. **Utilidades de Imágenes** (`/src/utils/imageUtils.ts`)

#### Funciones disponibles:

- ✅ `compressImage()` - Comprime imágenes automáticamente
- ✅ `validateImageFile()` - Valida tipo y tamaño de archivos
- ✅ `createImagePreview()` - Genera previsualizaciones
- ✅ `getPaymentProofUrl()` - Construye URLs correctas
- ✅ `downloadPaymentProof()` - Descarga comprobantes

#### Optimización automática:
```typescript
// Reduce tamaño de imágenes grandes manteniendo calidad
const compressedFile = await compressImage(file, 1200, 0.8);
// - Redimensiona a máximo 1200px
// - Calidad JPEG al 80%
// - Logs de reducción de tamaño
```

---

### 2. **Modal de Checkout para Meseros** (CheckoutBeforeSendModal)

#### Mejoras implementadas:

✅ **Validación de archivos**
- Solo permite imágenes (JPEG, PNG, WEBP)
- Máximo 5MB de tamaño
- Mensajes de error claros

✅ **Compresión automática**
- Las fotos tomadas desde móviles se comprimen automáticamente
- Indicador de "Procesando imagen..."
- Logs detallados en consola

✅ **Captura de cámara móvil**
```typescript
<input
  type="file"
  accept="image/*"
  capture="environment" // ← Fuerza cámara trasera
/>
```

✅ **Preview de imagen**
- Muestra la foto antes de enviar
- Botón para eliminar y tomar otra
- Overlay con confirmación visual

---

### 3. **Vista de Comprobantes - Cajero** (CashierDashboard)

#### Componente QuickProofView

Modal optimizado para verificación rápida de comprobantes:

✅ **Visualización mejorada**
- Imagen grande y clara del comprobante
- Path completo para debugging
- Manejo de errores con mensajes útiles

✅ **Acciones de verificación**
```typescript
// Botones claros y visibles
- ✓ Confirmar (verde) → cambia a "pagado"
- ✕ Rechazar (rojo) → vuelve a "entregado"
```

✅ **Resumen de orden**
- Items incluidos
- Total a pagar
- Método de pago destacado

#### Filtro de órdenes

```typescript
// Toggle entre vistas
<button onClick={() => setFilterStatus('all')}>
  Todas
</button>
<button onClick={() => setFilterStatus('por_verificar')}>
  Por Verificar {badge}
</button>
```

✅ **Badge con contador**
- Notificación visual de pagos pendientes
- Animación de campana
- Actualización en tiempo real vía WebSocket

---

### 4. **Modal de Detalles** (OrderDetailModal)

#### Componente PaymentInfoSection

✅ **Visualización de comprobantes**
- Carga correcta desde `/api/static/proofs/`
- Click para ver en tamaño completo
- Modal de imagen expandida

✅ **Manejo de errores**
```typescript
// Si falla la carga
⚠️ No se pudo cargar el comprobante
Ruta: /api/static/proofs/order_xxx.jpg
[Intentar abrir en nueva pestaña]
```

✅ **Logs de debugging**
```typescript
console.log('✅ Imagen cargada exitosamente:', url);
console.error('❌ Error cargando imagen:', url);
```

---

## 🔧 Configuración del Backend

### Requisitos importantes:

#### 1. Servir archivos estáticos SIN autenticación

```go
// En cmd/api/main.go
// ⚠️ ANTES de router.SetupRoutes()
app.Static("/api/static", uploadsDir)
```

#### 2. CORS configurado

```go
router.Use(func(c *gin.Context) {
    c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
    c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
    
    if c.Request.Method == "OPTIONS" {
        c.AbortWithStatus(204)
        return
    }
    
    c.Next()
})
```

#### 3. Endpoint de órdenes con pago

```
POST /api/orders/with-payment
Content-Type: multipart/form-data

Campos:
- order_data: JSON (string)
- payment_method: "efectivo" | "transferencia"
- payment_proof: File (opcional, requerido para transferencia)
```

---

## 📱 Flujo de Usuario - Mesero

1. **Agregar items al carrito**
   - Selecciona mesa y productos
   - Personaliza ingredientes/acompañantes

2. **Checkout antes de enviar**
   - Click en botón "💰 Cobrar y Enviar"
   - Modal CheckoutBeforeSendModal aparece

3. **Seleccionar método de pago**
   - **Efectivo**: Solo confirmar
   - **Transferencia**: Requerido tomar foto

4. **Capturar comprobante** (transferencia)
   - Click en botón "📸 Tomar Foto"
   - Se abre cámara trasera del móvil
   - Captura el comprobante
   - Sistema comprime automáticamente
   - Preview de la imagen

5. **Enviar orden**
   - Click en "ADJUNTAR Y ENVIAR COMANDA"
   - FormData se construye automáticamente
   - Orden enviada con comprobante

6. **Estado de la orden**
   - Backend crea orden con status: `por_verificar`
   - WebSocket notifica al cajero
   - Badge de notificación actualizado

---

## 💼 Flujo de Usuario - Cajero

1. **Notificación visual**
   ```
   🔔 X pagos por verificar
   ```

2. **Filtrar por estado**
   - Click en "Por Verificar"
   - Solo muestra órdenes con comprobante pendiente

3. **Seleccionar mesa**
   - Click en mesa con órdenes activas
   - Grid de órdenes aparece

4. **Verificar comprobante**
   - Botón "🔍 Verificar Comprobante"
   - QuickProofView modal se abre
   - Imagen grande y clara del comprobante

5. **Tomar decisión**
   - **✓ Confirmar**: Orden → `pagado`
   - **✕ Rechazar**: Orden → `entregado`

6. **WebSocket actualiza**
   - Todos los dashboards reciben actualización
   - Badge se reduce automáticamente

---

## 🐛 Debugging

### Logs importantes a revisar:

#### Frontend (Consola del navegador)

```javascript
// Al capturar imagen
📸 Imagen capturada: { nombre, tamaño, tipo }
📊 Compresión de imagen: { original, comprimida, reducción }
✅ Imagen procesada y lista para enviar

// Al cargar comprobante
✅ Imagen cargada exitosamente: /api/static/proofs/...
❌ Error cargando imagen: /api/static/proofs/...

// Al enviar FormData
📦 Enviando FormData:
  order_data: {...}
  payment_method: transferencia
  payment_proof: File(comprobante.jpg, 245678 bytes, image/jpeg)
```

#### Backend (Logs del servidor)

```
[GIN] POST /api/orders/with-payment
Recibido archivo: comprobante.jpg (245KB)
Guardado en: uploads/proofs/order_abc123_timestamp.jpg
Orden creada: ID=abc123, Status=por_verificar
```

### Problemas comunes:

#### ❌ Error: "missing or malformed jwt" al cargar imágenes

**Causa**: La ruta `/api/static/` requiere autenticación

**Solución**: 
```go
// Mover ANTES de router.SetupRoutes()
app.Static("/api/static", uploadsDir)
```

#### ❌ Imagen no carga (404)

**Verificar**:
1. Backend está corriendo
2. Path es correcto: `/api/static/proofs/order_xxx.jpg`
3. Archivo existe en el servidor
4. CORS está habilitado

**Test manual**:
```bash
curl -I http://localhost:8080/api/static/proofs/order_xxx.jpg
# Debe devolver 200 OK
```

#### ❌ FormData no se envía correctamente

**Causa común**: `Content-Type` establecido manualmente

**Solución**:
```typescript
// ❌ MAL
headers: {
  'Content-Type': 'multipart/form-data', // ← NO hacer esto
  'Authorization': `Bearer ${token}`
}

// ✅ BIEN
headers: {
  'Authorization': `Bearer ${token}`
  // El navegador establece Content-Type automáticamente con boundary
}
```

#### ❌ Imagen muy grande / Upload falla

**Solución ya implementada**:
```typescript
// Compresión automática en CheckoutBeforeSendModal
const compressedFile = await compressImage(file, 1200, 0.8);
// Reduce tamaño típicamente en 60-80%
```

---

## 🧪 Testing

### Caso 1: Orden con efectivo

```typescript
// No requiere comprobante
paymentMethod: 'efectivo'
proofFile: null
✅ Debe crear orden con status: 'por_verificar'
```

### Caso 2: Orden con transferencia

```typescript
// Requiere comprobante
paymentMethod: 'transferencia'
proofFile: File (imagen comprimida)
✅ Debe subir archivo
✅ Debe crear orden con payment_proof_path
✅ Status: 'por_verificar'
```

### Caso 3: Verificación desde cámara móvil

```typescript
// Desde dispositivo Android/iOS
1. Abrir desde móvil
2. Click en "Tomar Foto"
3. Cámara trasera debe abrirse
4. Capturar imagen
5. Compresión automática
6. Preview correcto
7. Envío exitoso
```

---

## 📊 Estados de Órdenes con Pago

```typescript
type OrderStatus =
  | 'pendiente_aprobacion'  // ← Orden sin pago
  | 'por_verificar'         // ← Con pago, pendiente verificación ⭐
  | 'pagado'                // ← Verificado por cajero ✅
  | 'rechazado'             // ← Rechazado (vuelve a "entregado")
  | 'cancelado'             // ← Cancelado
```

### Flujo de estados:

```
[Mesero toma orden]
       ↓
[Selecciona método de pago]
       ↓
    Efectivo           Transferencia
       ↓                    ↓
                      [Captura foto]
       ↓                    ↓
    [Envía]            [Comprime]
       ↓                    ↓
       └──────→ por_verificar ←──────┘
                      ↓
               [Cajero revisa]
                      ↓
              Confirmar / Rechazar
                 ↓         ↓
              pagado    entregado
```

---

## 🎨 Estilos y UX

### Indicadores visuales implementados:

✅ **Badge de notificación**
```tsx
{pendingVerificationCount > 0 && (
  <span className="animate-pulse">🔔</span>
  <span className="bg-yellow-100 text-yellow-800 badge">
    {count} pagos por verificar
  </span>
)}
```

✅ **Botones con iconos**
```tsx
// Verificar
🔍 Verificar Comprobante (gradiente azul)

// Confirmar
✓ Confirmar (verde)

// Rechazar
✕ Rechazar (rojo)
```

✅ **Indicador de carga**
```tsx
{isCompressing && (
  <div className="animate-spin border-t-transparent" />
  <span>Procesando imagen...</span>
)}
```

---

## 🚀 Próximos Pasos Recomendados

### Funcionalidades adicionales sugeridas:

1. **Zoom en comprobantes**
   - Pinch to zoom en dispositivos táctiles
   - Scroll para ver detalles

2. **Notificaciones push**
   - Notificar al cajero cuando llega nuevo pago
   - Sonido de alerta

3. **Historial de verificaciones**
   - Quién verificó cada pago
   - Timestamp de verificación

4. **Estadísticas**
   - Pagos verificados hoy
   - Tasa de rechazo
   - Método de pago más usado

5. **Filtros avanzados**
   - Por método de pago
   - Por rango de fecha
   - Por mesero

---

## 📞 Soporte

Si encuentras problemas:

1. **Verifica los logs** (frontend y backend)
2. **Revisa la configuración** de rutas estáticas
3. **Testea manualmente** las URLs de imágenes
4. **Valida CORS** con curl/Postman

---

## ✅ Checklist de Implementación

- [x] Archivo `imageUtils.ts` creado
- [x] CheckoutBeforeSendModal actualizado con compresión
- [x] CashierDashboard con QuickProofView
- [x] OrderDetailModal con PaymentInfoSection
- [x] Validación de archivos
- [x] Compresión automática
- [x] Logs de debugging
- [x] Manejo de errores
- [x] Indicadores visuales
- [x] WebSocket para actualizaciones en tiempo real
- [x] Filtro por estado "por_verificar"

---

## 🎉 ¡Todo Listo!

El sistema está completamente implementado y listo para:
- ✅ Capturar comprobantes desde móviles
- ✅ Comprimir imágenes automáticamente
- ✅ Verificar pagos rápidamente
- ✅ Notificar en tiempo real
- ✅ Manejar errores de manera elegante

**¡Prueba en un dispositivo móvil real para la mejor experiencia!** 📱

