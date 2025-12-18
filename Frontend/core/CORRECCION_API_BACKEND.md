# 🔧 Corrección: Integración Frontend-Backend

## 📋 Problema Identificado

El frontend estaba enviando peticiones a `http://localhost:3000/api/orders/with-payment` (el mismo frontend) en lugar de enviarlas al backend en `http://localhost:8080`.

### Errores encontrados:

1. ❌ **URL incorrecta**: Las peticiones se enviaban a `localhost:3000` (frontend) en lugar del backend
2. ❌ **Content-Type manual**: Se establecía `Content-Type: application/json` manualmente, rompiendo el `multipart/form-data`
3. ❌ **Sin proxy configurado**: Vite no tenía proxy para redirigir `/api/*` al backend

## ✅ Solución Implementada

### 1. Configuración de Proxy en Vite

**Archivo modificado**: `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      // Redirige /api/* al backend Go
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Redirige WebSocket
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
```

**Beneficios**:
- ✅ En desarrollo: `localhost:3000/api/*` → redirige a → `localhost:8080/api/*`
- ✅ En producción: nginx maneja la redirección
- ✅ No hay problemas de CORS

### 2. Corrección de ordersAPI.ts

**Archivo modificado**: `src/features/orders/ordersAPI.ts`

#### Cambio 1: Rutas relativas
```typescript
// ❌ ANTES (URL absoluta - no funcionaba en dev)
const BACKEND_URL = 'http://localhost:8080';
const API_URL = `${BACKEND_URL}/api/orders`;

// ✅ AHORA (ruta relativa - funciona con proxy)
const API_URL = '/api/orders';
```

#### Cambio 2: Eliminar Content-Type manual con FormData
```typescript
// ❌ ANTES
const config = {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data' // ❌ Esto rompe el boundary
  }
};

// ✅ AHORA
const config = {
  headers: {
    Authorization: `Bearer ${token}`,
    // NO incluir Content-Type - el navegador lo establece automáticamente
  }
};
```

#### Cambio 3: Logs de debugging
```typescript
console.log('🔄 Creando orden con pago:', {
  paymentMethod,
  hasProofFile: !!paymentProofFile,
  endpoint: `${API_URL}/with-payment`
});

if (paymentProofFile) {
  console.log('📎 Archivo adjunto:', {
    name: paymentProofFile.name,
    size: paymentProofFile.size,
    type: paymentProofFile.type
  });
}
```

## 🚀 Cómo usar

### 1. Reiniciar el servidor de desarrollo

```bash
# Detener el servidor actual (Ctrl+C en la terminal donde corre npm run dev)
# O matar el proceso:
kill $(lsof -ti:3000)

# Luego reiniciar
npm run dev
```

### 2. Verificar que funciona

Al crear una orden con pago, deberías ver en la consola del navegador:

```
🔄 Creando orden con pago: {
  paymentMethod: "efectivo",
  hasProofFile: false,
  endpoint: "/api/orders/with-payment"
}
```

Y en la pestaña Network de DevTools:

```
Request URL: http://localhost:3000/api/orders/with-payment
→ (proxy redirige a) http://localhost:8080/api/orders/with-payment
Status: 200 OK (o 201 Created)
```

### 3. Estructura de la petición

#### Para Efectivo:
```
POST /api/orders/with-payment
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="order_data"

{"table_id":"...","table_number":1,"items":[...]}
------WebKitFormBoundary...
Content-Disposition: form-data; name="payment_method"

efectivo
------WebKitFormBoundary...--
```

#### Para Transferencia (con comprobante):
```
POST /api/orders/with-payment
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="order_data"

{"table_id":"...","table_number":1,"items":[...]}
------WebKitFormBoundary...
Content-Disposition: form-data; name="payment_method"

transferencia
------WebKitFormBoundary...
Content-Disposition: form-data; name="payment_proof"; filename="comprobante.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary...--
```

## 🔍 Debugging

### Ver la petición completa en la consola

El archivo `ordersAPI.ts` ahora incluye logs detallados:

```typescript
// Antes de enviar
console.log('🔄 Creando orden con pago:', {...});
console.log('📎 Archivo adjunto:', {...});

// Después de recibir respuesta
console.log('✅ Orden creada exitosamente:', response.data);
```

### Verificar en DevTools

1. Abrir DevTools (F12)
2. Ir a la pestaña **Network**
3. Filtrar por `with-payment`
4. Al crear una orden, verás la petición
5. Click en la petición para ver:
   - **Headers**: Debe tener `Content-Type: multipart/form-data; boundary=...`
   - **Payload**: Verás los campos del FormData
   - **Response**: La orden creada

### Errores comunes

#### Error 413 Payload Too Large
**Causa**: El archivo (imagen) es demasiado grande y nginx lo rechaza
**Solución**: Aumentar `client_max_body_size` en nginx.conf y reconstruir el contenedor
```bash
docker-compose up -d --build frontend
```

#### Error 400 Bad Request
**Causa**: El backend no puede parsear el FormData
**Solución**: Verificar que NO estés estableciendo `Content-Type` manualmente

#### Error 404 Not Found
**Causa**: El proxy no está funcionando
**Solución**: Reiniciar el servidor de desarrollo

#### Error CORS
**Causa**: El backend no tiene CORS configurado
**Solución**: Verificar que el backend Go tenga el middleware CORS

#### 📱 Imágenes no se ven en celulares
**Síntoma**: Al ver el comprobante de pago desde un celular, aparece "Imagen no disponible"
**Causa**: Se usaban URLs absolutas con `localhost:8080` que solo funcionan en la PC servidor
**Solución**: Usar rutas relativas que funcionan en toda la red

```typescript
// ❌ ANTES (solo funciona en localhost)
src={`http://localhost:8080${selectedOrderDetails.payment_proof_path}`}

// ✅ AHORA (funciona en toda la red)
src={`/api${selectedOrderDetails.payment_proof_path}`}
```

**Por qué funciona ahora:**
- En desarrollo: Vite proxy redirige `/api/*` → `localhost:8080`
- En producción: nginx redirige `/api/*` → `backend:8080`
- En celular: Usa la IP de tu servidor (ej: `192.168.1.100:3000/api/uploads/...`)


## 🚨 Problema Adicional: Error 413 (Payload demasiado grande)

### Síntoma
```
[error] client intended to send too large body: 2448400 bytes
POST /api/orders/with-payment HTTP/1.1" 413
```

### Causa
Nginx tiene un límite por defecto muy bajo (`1M`) para el tamaño del cuerpo de las peticiones. Cuando se intenta subir una imagen de ~2.4MB, el servidor rechaza la petición con un error 413.

### Solución

**Archivo modificado**: `nginx.conf`

```nginx
server {
  listen 80;
  
  # ✅ Aumentar el límite de tamaño del cuerpo a 10MB
  client_max_body_size 10M;
  
  location /api {
    proxy_pass http://backend:8080;
    # ... otros headers ...
    
    # ✅ Timeouts para peticiones largas (subida de archivos)
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
  }
}
```

**Después de modificar nginx.conf**:
```bash
# Reconstruir y reiniciar el contenedor frontend
docker-compose up -d --build frontend
```

## 📁 Archivos Modificados

1. ✅ `vite.config.ts` - Agregado proxy para `/api`, `/ws` y `/uploads`
2. ✅ `src/features/orders/ordersAPI.ts` - Corregido URL y Content-Type
3. ✅ `nginx.conf` - Aumentado límite de tamaño del cuerpo a 10MB + proxy para `/uploads`
4. ✅ `src/features/shared/OrderDetailModal.tsx` - Cambiado URLs absolutas a rutas relativas para imágenes
5. ✅ `src/features/admin/components/OrderManagement.tsx` - WebSocket con ruta relativa
6. ✅ `src/features/cashier/CashierDashboard.tsx` - WebSocket con ruta relativa
7. ✅ `src/hooks/useWebSockets.ts` - Ya usaba rutas relativas (no requirió cambios)


## 🎯 Resultado Esperado

Ahora las órdenes con pago deberían crearse correctamente:

```javascript
// En el componente
dispatch(addNewOrder({
  orderData: {
    table_id: "...",
    table_number: 1,
    items: [...]
  },
  paymentMethod: 'efectivo', // o 'transferencia'
  paymentProofFile: file // o null
}));

// Resultado:
// ✅ POST /api/orders/with-payment → 200 OK
// ✅ Orden creada con payment_method y payment_proof_path (si hay archivo)
```

## 🔄 En Producción (Docker)

En producción, el flujo es diferente:

```
Usuario → nginx:80 → /api/* → proxy_pass → backend:8080
```

El nginx.conf ya está configurado correctamente:

```nginx
location /api {
  proxy_pass http://backend:8080;
  proxy_set_header Host $host;
  # ... otros headers
}
```

Por lo tanto, **no necesitas cambiar nada más**. La misma URL relativa `/api/orders/with-payment` funcionará tanto en desarrollo (con Vite proxy) como en producción (con nginx).

## ✨ Ventajas de esta solución

1. ✅ **Funciona en desarrollo y producción** sin cambios
2. ✅ **No hay problemas de CORS** (el proxy hace que parezca same-origin)
3. ✅ **Código más limpio** (no necesitas cambiar URLs según el entorno)
4. ✅ **Fácil de debuggear** (logs claros en consola)
5. ✅ **Compatible con FormData** (Content-Type automático)

---

## 🆘 Si algo no funciona

1. **Reiniciar el servidor de desarrollo** (importante después de cambiar vite.config.ts)
2. **Limpiar cache del navegador** (Ctrl+Shift+R)
3. **Verificar que el backend esté corriendo** en el puerto 8080:
   ```bash
   curl http://localhost:8080/health
   # o
   docker-compose ps
   ```
4. **Revisar logs del backend** para ver si la petición llega

---

**Última actualización**: 17 de diciembre, 2025

