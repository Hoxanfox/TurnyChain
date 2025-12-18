# 🐛 Solución: Error al cargar comprobantes

## ❌ Problema Identificado

```
❌ Error cargando comprobante: /static/proofs/order_xxx.jpg
```

El backend estaba devolviendo `/static/proofs/...` en lugar de `/api/static/proofs/...`

---

## ✅ Solución Implementada

### 1. Función `getPaymentProofUrl` actualizada

**Archivo:** `/src/utils/imageUtils.ts`

```typescript
export function getPaymentProofUrl(paymentProofPath: string): string {
  // Si el path comienza con /static/ (sin /api), agregamos /api
  if (paymentProofPath.startsWith('/static/')) {
    return `/api${paymentProofPath}`;
  }
  
  // Si ya tiene /api/static/, lo devolvemos tal cual
  return paymentProofPath;
}
```

**Ahora maneja ambos casos:**
- ✅ `/static/proofs/order_xxx.jpg` → `/api/static/proofs/order_xxx.jpg`
- ✅ `/api/static/proofs/order_xxx.jpg` → `/api/static/proofs/order_xxx.jpg`

---

## 🔍 Verificación Backend

### Opción 1: Corregir el backend (Recomendado)

El backend Go debe devolver la ruta completa con `/api`:

```go
// En tu handler de órdenes
paymentProofPath := fmt.Sprintf("/api/static/proofs/%s", filename)

// NO devolver solo:
paymentProofPath := fmt.Sprintf("/static/proofs/%s", filename)
```

**Busca en tu código Go:**
```bash
cd /path/to/backend
grep -r "payment_proof_path" --include="*.go"
grep -r "/static/proofs" --include="*.go"
```

### Opción 2: Usar la función de frontend (Ya implementado)

La función `getPaymentProofUrl()` ahora corrige automáticamente las rutas.

---

## 🧪 Testing

### Test 1: Verificar que la imagen carga

1. Abre el dashboard del cajero
2. Selecciona una orden con comprobante
3. Click en "🔍 Verificar Comprobante"
4. La imagen debe cargar correctamente

### Test 2: Verificar la URL en consola

Abre la consola del navegador, deberías ver:

```
✅ Comprobante cargado: /api/static/proofs/order_xxx.jpg
```

En lugar de:

```
❌ Error cargando comprobante: /static/proofs/order_xxx.jpg
```

### Test 3: Verificar manualmente la URL

Abre en una nueva pestaña:
```
http://localhost:3000/api/static/proofs/order_5ac1ab42-9dd0-461b-9c9b-6c3ca380d07a_1766030392.jpg
```

Si carga, el problema está resuelto ✅

---

## 🔄 Proxy de Vite

El proxy está configurado para redirigir `/api` al backend:

**vite.config.ts:**
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    },
    '/ws': {
      target: 'ws://localhost:8080',
      ws: true
    }
  }
}
```

Esto significa:
- `http://localhost:3000/api/static/proofs/xxx.jpg` → `http://localhost:8080/api/static/proofs/xxx.jpg`

---

## 📝 Checklist

- [x] Función `getPaymentProofUrl()` actualizada
- [x] `OrderDetailModal` usa `getPaymentProofUrl()`
- [x] `CashierDashboard` usa `getPaymentProofUrl()`
- [x] Build compilado exitosamente
- [ ] Backend devuelve rutas con `/api` (verificar)
- [ ] Test manual de carga de imagen

---

## 🚀 Siguiente Paso

**Prueba ahora la aplicación:**

1. Inicia el backend (si no está corriendo):
```bash
cd /path/to/backend
docker-compose up
```

2. Inicia el frontend:
```bash
cd /home/deivid/Documentos/TurnyChain/Frontend/core
npm run dev
```

3. Abre en el navegador: `http://localhost:3000`

4. Ve al dashboard del cajero y verifica una orden con comprobante

---

## 💡 Logs útiles

La consola mostrará logs detallados:

**✅ Éxito:**
```javascript
✅ Imagen procesada y lista para enviar
✅ Comprobante cargado: /api/static/proofs/order_xxx.jpg
```

**❌ Error:**
```javascript
❌ Error cargando comprobante: /api/static/proofs/order_xxx.jpg
  Path original: /static/proofs/order_xxx.jpg
```

Si ves el segundo caso, significa que:
- La URL ya está correcta con `/api`
- Pero el archivo no existe en el servidor
- O el backend no está sirviendo archivos estáticos correctamente

---

## 🛠️ Troubleshooting Adicional

### Error: 404 Not Found

**Verificar que el archivo existe:**
```bash
# En el servidor backend
ls -la /path/to/uploads/proofs/
```

**Verificar que el backend sirve estáticos:**
```go
// En cmd/api/main.go
app.Static("/api/static", uploadsDir) // ← Debe estar ANTES de router.SetupRoutes()
```

### Error: 401 Unauthorized

**Problema:** La ruta requiere autenticación

**Solución:** Asegurar que `/api/static/` no pase por el middleware de auth:

```go
// La ruta Static debe estar ANTES de aplicar middlewares
app.Static("/api/static", uploadsDir)

// DESPUÉS puedes agregar tus rutas protegidas
router.SetupRoutes(app)
```

### Error: CORS

**Verificar headers CORS:**
```bash
curl -I http://localhost:8080/api/static/proofs/order_xxx.jpg
```

Debe incluir:
```
Access-Control-Allow-Origin: *
```

---

## ✅ Resumen

La corrección ya está implementada en el frontend. Ahora el sistema:

1. ✅ Detecta automáticamente rutas con/sin `/api`
2. ✅ Agrega `/api` si falta
3. ✅ Usa el proxy de Vite para redirigir al backend
4. ✅ Muestra logs útiles para debugging

**¡Prueba la aplicación y debería funcionar!** 🎉

