# ✅ Checklist: Verificación de Fix de Impresión Móvil

## 📋 Pre-Verificación

- [x] Código modificado en `/src/utils/printUtils.ts`
- [x] Compilación exitosa sin errores TypeScript
- [x] Documentación creada en `FIX_IMPRESION_MOBILE.md`
- [x] Script de prueba creado en `test-mobile-print-detection.js`

---

## 🧪 Tests en Desktop

### Chrome/Edge/Brave (Desktop)
- [ ] Abrir aplicación en modo desktop
- [ ] Iniciar sesión como cajero
- [ ] Confirmar un pago de una orden
- [ ] Verificar que se abre nueva ventana con la comanda
- [ ] Verificar que la comanda se ve correctamente
- [ ] Confirmar que se puede imprimir
- [ ] Verificar en consola: `"🖥️ Imprimiendo desde desktop usando window.open..."`

### Firefox (Desktop)
- [ ] Repetir pasos anteriores
- [ ] Verificar mismo comportamiento

### Safari (Desktop - Mac)
- [ ] Repetir pasos anteriores
- [ ] Verificar mismo comportamiento

---

## 📱 Tests en Móvil (Método 1: DevTools)

### Chrome DevTools en modo móvil
- [ ] Abrir DevTools (F12)
- [ ] Toggle Device Toolbar (Ctrl+Shift+M)
- [ ] Seleccionar "iPhone 12 Pro" o similar
- [ ] Refrescar página
- [ ] Iniciar sesión como cajero
- [ ] Confirmar un pago
- [ ] **NO debería aparecer error de pop-up bloqueado**
- [ ] Verificar en consola: `"📱 Imprimiendo desde dispositivo móvil usando iframe..."`
- [ ] Verificar que aparece diálogo de impresión

### Verificación del User Agent
- [ ] En consola, ejecutar: `navigator.userAgent`
- [ ] Verificar que contiene "Mobile" o nombre de dispositivo móvil
- [ ] Ejecutar script de prueba: copiar contenido de `test-mobile-print-detection.js`
- [ ] Verificar que detecta como MÓVIL

---

## 📱 Tests en Móvil (Método 2: Dispositivo Real)

### Android (Chrome Mobile)
- [ ] Abrir aplicación en dispositivo Android real
- [ ] Iniciar sesión como cajero
- [ ] Confirmar un pago
- [ ] **NO debería aparecer mensaje de pop-up bloqueado**
- [ ] Debería aparecer diálogo de impresión/guardar PDF
- [ ] Intentar guardar como PDF
- [ ] Verificar que el PDF se genera correctamente

### iOS (Safari Mobile)
- [ ] Abrir aplicación en iPhone/iPad
- [ ] Iniciar sesión como cajero
- [ ] Confirmar un pago
- [ ] Verificar que aparece diálogo de impresión
- [ ] Intentar guardar como PDF o imprimir vía AirPrint
- [ ] Verificar contenido del PDF

### Android (Samsung Internet)
- [ ] Repetir pasos de Android Chrome
- [ ] Verificar mismo comportamiento

---

## 🎯 Tests Funcionales

### Configuración de Impresión
- [ ] Abrir configuración de impresión (botón 🖨️)
- [ ] Cambiar a "Modo Automático"
- [ ] Guardar configuración
- [ ] Confirmar pago → Debería imprimir sin confirmación
- [ ] Cambiar a "Con Confirmación"
- [ ] Confirmar pago → Debería pedir confirmación primero

### Múltiples Copias
- [ ] Configurar 2-3 copias
- [ ] Confirmar pago
- [ ] Verificar que se imprimen múltiples veces (en desktop, ventanas múltiples)

### Tamaño de Fuente
- [ ] Cambiar tamaño de fuente a "Grande"
- [ ] Imprimir comanda
- [ ] Verificar que el texto es más grande
- [ ] Cambiar a "Pequeño"
- [ ] Verificar que el texto es más pequeño

### Logo
- [ ] Desactivar logo
- [ ] Imprimir comanda
- [ ] Verificar que no aparece 🍽️ TURNY CHAIN
- [ ] Activar logo
- [ ] Verificar que aparece

---

## 🔍 Tests de Contenido

### Datos Básicos
- [ ] Fecha y hora correctas
- [ ] Número de mesa correcto
- [ ] Nombre del mesero correcto
- [ ] ID de pedido correcto

### Items
- [ ] Cantidad correcta (badge negro)
- [ ] Nombre del plato en MAYÚSCULAS
- [ ] Precio correcto

### Personalizaciones
- [ ] Ingredientes activos se muestran
- [ ] Acompañantes seleccionados se muestran
- [ ] Notas especiales se muestran
- [ ] Badge "PARA LLEVAR" o "COMER AQUÍ" si aplica

### Tipos de Orden
- [ ] Orden "En Mesa": Badge 🍽️ EN MESA
- [ ] Orden "Para Llevar": Badge 🥡 PARA LLEVAR
- [ ] Orden "Domicilio": Badge 🏍️ DOMICILIO + datos de entrega

### Total y Pago
- [ ] Total correcto
- [ ] Método de pago correcto (EFECTIVO/TRANSFERENCIA)
- [ ] Estado PAGADO visible

---

## 🐛 Tests de Errores

### Pop-ups Bloqueados (Solo Desktop)
- [ ] Bloquear pop-ups en Chrome settings
- [ ] Intentar imprimir (desktop)
- [ ] Verificar que aparece mensaje de error apropiado
- [ ] Desbloquear pop-ups
- [ ] Verificar que funciona

### Sin Permisos de Impresión
- [ ] (Difícil de probar, requiere configuración del navegador)
- [ ] Verificar que aparece mensaje de error específico

### Orden sin Items
- [ ] (Edge case, no debería ocurrir en producción)
- [ ] Verificar que no crashea la aplicación

---

## 📊 Tests de Performance

### Tiempo de Respuesta
- [ ] Confirmar pago
- [ ] Medir tiempo hasta que aparece diálogo de impresión
- [ ] Debería ser < 2 segundos

### Memoria
- [ ] Imprimir 10+ comandas consecutivas
- [ ] Verificar en DevTools que no hay memory leaks
- [ ] Los iframes se eliminan correctamente del DOM

### Red (Mobile)
- [ ] Simular red 3G lenta
- [ ] Confirmar pago
- [ ] Verificar que la impresión funciona (es local, no requiere red)

---

## ✅ Criterios de Aceptación

Para considerar el fix exitoso, TODOS estos puntos deben cumplirse:

1. ✅ **Desktop funciona igual que antes**
   - No hay regresiones
   - window.open() se usa correctamente

2. ✅ **Móvil ahora funciona**
   - No hay errores de pop-up bloqueado
   - Diálogo de impresión aparece
   - Se puede guardar como PDF

3. ✅ **Detección automática funciona**
   - Se usa método correcto según dispositivo
   - Logs en consola son informativos

4. ✅ **Contenido idéntico en ambos métodos**
   - Mismo HTML renderizado
   - Mismos estilos aplicados
   - Mismo output impreso

5. ✅ **Sin errores en consola**
   - No warnings relacionados con impresión
   - No memory leaks

6. ✅ **Configuración persiste**
   - LocalStorage funciona
   - Preferencias se mantienen al recargar

---

## 🎉 Resultado Esperado

Al completar todos los tests, deberías poder confirmar:

- ✅ La impresión funciona en desktop
- ✅ La impresión funciona en móviles (Android/iOS)
- ✅ El contenido impreso es correcto y completo
- ✅ La configuración de impresión funciona
- ✅ No hay errores ni warnings
- ✅ Los cajeros pueden usar cualquier dispositivo

---

## 📝 Notas Adicionales

### Si encuentra problemas en móvil:
1. Verificar que JavaScript está habilitado
2. Verificar que el navegador es moderno (2020+)
3. Revisar consola del navegador móvil (usar Remote Debugging)
4. Verificar permisos del navegador

### Si encuentra problemas en desktop:
1. Verificar que pop-ups están permitidos
2. Revisar configuración de impresora
3. Probar en modo incógnito

### Para debugging:
1. Usar Remote Debugging de Chrome para Android
2. Usar Safari Web Inspector para iOS
3. Revisar logs en consola (emojis ayudan a identificar móvil/desktop)

---

**Creado:** 21/12/2025
**Versión:** 1.0

