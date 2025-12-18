# IMPLEMENTACIÓN DE PAGO ANTES DE ENVIAR COMANDA

## Resumen de Cambios

Se ha implementado exitosamente el flujo de cobro ANTES de enviar la comanda al sistema. Ahora cuando el mesero termina de armar una orden, primero debe cobrarle al cliente y luego se envía la orden con los datos de pago incluidos.

## Archivos Modificados

### 1. **CheckoutBeforeSendModal.tsx** (NUEVO)
- **Ruta:** `/src/features/waiter/components/CheckoutBeforeSendModal.tsx`
- **Función:** Modal que se abre ANTES de enviar la comanda para gestionar el pago
- **Características:**
  - Selección de método de pago: Efectivo o Transferencia
  - Para efectivo: Confirmación simple
  - Para transferencia: Captura obligatoria de foto del comprobante
  - Vista previa de la imagen capturada
  - Validaciones antes de confirmar
  - Botón para eliminar y retomar foto si quedó mal

### 2. **ordersAPI.ts**
- **Cambios:** 
  - Actualizada función `createOrder()` para aceptar parámetros opcionales de pago:
    - `paymentMethod`: 'efectivo' | 'transferencia'
    - `paymentProofFile`: Archivo de imagen del comprobante
  - Si hay datos de pago, envía la orden al endpoint `/api/orders/with-payment` usando FormData
  - Si no hay datos de pago, envía al endpoint normal `/api/orders`

### 3. **ordersSlice.ts**
- **Cambios:**
  - Actualizado `addNewOrder` thunk para aceptar un objeto con:
    ```typescript
    {
      orderData: NewOrderPayload,
      paymentMethod?: string,
      paymentProofFile?: File | null
    }
    ```

### 4. **WaiterDashboard.tsx** (Vista Móvil)
- **Estados agregados:**
  - `isCheckoutBeforeSend`: Controla si el modal de checkout está abierto
  - `paymentData`: Almacena temporalmente los datos de pago
  
- **Cambios en flujo:**
  - `handleSendOrder()` ahora abre el modal de checkout en lugar de enviar directamente
  - Nuevo `handleConfirmPaymentBeforeSend()` que:
    1. Guarda los datos de pago
    2. Cierra el modal de checkout
    3. Construye el payload de la orden
    4. Envía la orden con los datos de pago al backend
    5. Limpia el carrito y mesa

- **Modal agregado:**
  - `CheckoutBeforeSendModal` que se muestra cuando `isCheckoutBeforeSend === true`

### 5. **WaiterDashboardDesktop.tsx** (Vista Desktop)
- **Mismos cambios que en la vista móvil**
- Estados, funciones y modal agregados de forma idéntica

### 6. **CurrentOrder.tsx**
- **Cambios visuales:**
  - Actualizado el texto del botón: "💰 Cobrar y Enviar Orden"
  - Agregado mensaje indicador: "💳 Primero cobra, luego envía la comanda"
  - Mejorado el styling del botón con gradientes

### 7. **OrderDetailModal.tsx** (YA EXISTÍA)
- **Función:** Ya muestra la foto del comprobante cuando está disponible
- **Visualización:**
  - Sección "💳 Información de Pago" con método usado
  - Imagen del comprobante clickeable para ver en tamaño completo
  - Manejo de errores si la imagen no carga

## Flujo Completo del Mesero

### ANTES (Problema):
1. Mesero selecciona mesa
2. Agrega items al carrito
3. Envía la orden ❌
4. Luego iba a "Gestión de Pagos" a cobrar

### AHORA (Solución):
1. Mesero selecciona mesa
2. Agrega items al carrito
3. Click en "💰 Cobrar y Enviar Orden"
4. **Se abre modal de checkout:**
   - Selecciona método: Efectivo o Transferencia
   - Si es transferencia: Toma foto del comprobante
   - Confirma el pago
5. La orden se envía AL BACKEND con los datos de pago incluidos ✅
6. La orden queda registrada con:
   - `payment_method`: 'efectivo' | 'transferencia'
   - `payment_proof_path`: Ruta de la imagen (si es transferencia)
   - Estado inicial según el backend

## Endpoints del Backend Necesarios

El frontend ahora envía los datos al backend de la siguiente manera:

### Opción 1: Con datos de pago (NUEVA)
```
POST /api/orders/with-payment
Content-Type: multipart/form-data

FormData:
- order_data: JSON string con el payload de la orden
- payment_method: 'efectivo' | 'transferencia'
- payment_proof: File (imagen del comprobante) - opcional, solo para transferencia
```

### Opción 2: Sin datos de pago (ORIGINAL)
```
POST /api/orders
Content-Type: application/json

Body: NewOrderPayload
```

## Visualización de la Foto en Detalles de Orden

Cuando se visualiza una orden en `OrderDetailModal`, si tiene:
- `payment_method`: Muestra el método de pago con íconos
- `payment_proof_path`: Muestra la imagen del comprobante
  - URL: `http://localhost:8080${order.payment_proof_path}`
  - Clickeable para ver en tamaño completo
  - Maneja errores si la imagen no está disponible

## Características Técnicas

### Validaciones
- ✅ No se puede confirmar pago por transferencia sin adjuntar foto
- ✅ Solo acepta archivos de imagen
- ✅ Límite de tamaño: 5MB
- ✅ Vista previa de la imagen antes de confirmar
- ✅ Opción para eliminar y retomar la foto

### Experiencia de Usuario
- 📱 Botón de cámara optimizado para móviles (captura con cámara trasera)
- 💻 Compatible con desktop (selector de archivos)
- 🎨 UI moderna con gradientes y animaciones
- 🔄 Feedback visual en todos los estados
- ⚡ Carga rápida y responsive

## Pendientes del Backend

El backend debe:
1. ✅ Crear endpoint `/api/orders/with-payment` que acepte FormData
2. ✅ Guardar el archivo de imagen en el servidor
3. ✅ Almacenar en la BD:
   - `payment_method`
   - `payment_proof_path`
4. ✅ Retornar la orden creada con todos los datos

## Testing

Para probar el flujo completo:
1. Login como mesero
2. Seleccionar una mesa
3. Agregar items al carrito
4. Click en "Cobrar y Enviar Orden"
5. Seleccionar método de pago
6. Si es transferencia: Tomar/adjuntar foto
7. Confirmar
8. Verificar que:
   - El carrito se limpia
   - La mesa se desmarca
   - La orden aparece en "Mis Órdenes de Hoy"
   - En el detalle de la orden aparece la info de pago
   - La foto del comprobante es visible

## Notas Adicionales

- La variable `paymentData` en los componentes no se usa actualmente pero se mantiene por si se necesita en el futuro para tracking o debugging
- El modal de checkout tiene animaciones de fade-in para mejor UX
- Los gradientes de color son diferentes según el método: verde para efectivo, azul para transferencia
- El componente es reutilizable y puede usarse en otros contextos si se necesita

