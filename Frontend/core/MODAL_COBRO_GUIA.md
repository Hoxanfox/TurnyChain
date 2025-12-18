# 📱 Guía del Modal de Cobro - TurnyChain

## 🎯 Objetivo
Facilitar el proceso de cobro para los meseros con una interfaz intuitiva y segura que soporta pagos en efectivo y transferencias bancarias con comprobante fotográfico.

---

## 🚀 Acceso al Modal

### Desde PaymentsSlide (Cuarta pestaña)
1. Navega a la pestaña "💳 Gestión de Pagos" (cuarto punto en el footer)
2. Las órdenes con estado "entregado" muestran el botón **"💳 Cobrar"**
3. Toca el botón para abrir el modal

### Desde MyOrdersModal (Historial)
1. Toca el botón **"Hoy"** o **"Historial"** en el header
2. Encuentra una orden con estado "entregado"
3. Toca **"💳 Procesar Pago"**

---

## 💵 Modo 1: Pago en Efectivo

### Cuándo usar
- El cliente paga con billetes o monedas
- No requiere comprobante fotográfico

### Flujo
```
1. Modal abierto → Tab "Efectivo" (verde) seleccionado por defecto
2. Muestra:
   ✅ Mesa número X
   ✅ Total a recibir: $XX,XXX
   ✅ Emoji 💵 animado
   ✅ Mensaje: "Recibe el dinero en efectivo y confirma"
3. Recibe el dinero físicamente del cliente
4. Toca el botón verde "✅ CONFIRMAR PAGO EN EFECTIVO"
5. Procesando... (spinner)
6. Modal se cierra → Orden pasa a "por_verificar"
```

### Características
- ✅ Sin validaciones adicionales (no requiere foto)
- ✅ Confirmación instantánea
- ✅ El cambio se calcula mentalmente
- ✅ Color verde para representar "dinero efectivo"

---

## 📱 Modo 2: Pago por Transferencia

### Cuándo usar
- El cliente transfiere desde su banco o billetera digital
- **REQUIERE** foto del comprobante

### Flujo Detallado
```
1. Modal abierto → Cambiar al tab "Transferencia" (azul)
2. Lee las instrucciones al cliente:
   "Pide al cliente que transfiera a la cuenta Nequi 310..."
3. Espera a que el cliente realice la transferencia
4. Toca el botón "📸 Tomar Foto del Comprobante"
5. La CÁMARA TRASERA se abre automáticamente 📷
6. Enfoca el comprobante en la pantalla del cliente
7. Toma la foto
8. PREVISUALIZACIÓN: Revisa que la foto sea legible
   - ✅ Si está bien: Continúa
   - 🗑️ Si está borrosa: Toca el botón rojo para eliminar y reintentar
9. Toca el botón azul "📤 ENVIAR COMPROBANTE"
10. Procesando... (subiendo imagen al servidor)
11. Modal se cierra → Orden pasa a "por_verificar"
```

### Características Técnicas
- ✅ **Cámara nativa**: Usa `capture="environment"` para forzar cámara trasera
- ✅ **Validación de tamaño**: Máximo 5MB por foto
- ✅ **Validación de formato**: Solo imágenes (jpg, png, webp, etc.)
- ✅ **Previsualización inmediata**: URL temporal en memoria con `URL.createObjectURL()`
- ✅ **Botón deshabilitado**: No puedes enviar sin foto
- ✅ **Limpieza de memoria**: Libera la URL temporal al cerrar
- ✅ **Feedback visual**: 
  - Borde verde cuando hay foto
  - Overlay con "✅ Comprobante adjuntado"
  - Botón de eliminar en esquina superior derecha

---

## 🎨 Diseño del Modal

### Header (Fijo)
```
┌─────────────────────────────────────┐
│ 💳 Cobrar Mesa 5   [X]              │
│ Total a recibir                     │
└─────────────────────────────────────┘
```

### Total (Destacado)
```
┌─────────────────────────────────────┐
│          $45,000                    │
│    (Grande, fuente negrita)         │
└─────────────────────────────────────┘
```

### Tabs (Métodos de Pago)
```
┌──────────────┬──────────────────────┐
│ 💵 Efectivo  │ 📱 Transferencia     │
│  (VERDE)     │      (AZUL)          │
└──────────────┴──────────────────────┘
```

### Body Dinámico
**Efectivo:**
```
┌─────────────────────────────────────┐
│  ✅ Recibe el dinero en efectivo    │
│  Confirma una vez hayas recibido    │
│           💵                        │
│  (Emoji grande, animado)            │
│  El cambio se calcula manualmente   │
└─────────────────────────────────────┘
```

**Transferencia (Sin foto):**
```
┌─────────────────────────────────────┐
│ 📱 Instrucciones:                   │
│ Pide al cliente que transfiera...   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │      📸                         │ │
│ │   Tomar Foto del               │ │
│ │     Comprobante                │ │
│ │  (Botón grande, punteado)      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Transferencia (Con foto):**
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │   [Imagen del comprobante]      │ │
│ │                            [🗑️] │ │
│ │   (Previsualización)            │ │
│ │─────────────────────────────────│ │
│ │ ✅ Comprobante adjuntado        │ │
│ │ Revisa que la imagen sea legible│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Footer (Botón de Acción)
```
┌─────────────────────────────────────┐
│  [✅ CONFIRMAR PAGO EN EFECTIVO]    │  (Verde)
│       o                             │
│  [📤 ENVIAR COMPROBANTE]            │  (Azul)
│  * Obligatorio adjuntar comprobante │
└─────────────────────────────────────┘
```

---

## 🔐 Validaciones y Seguridad

### Cliente (Frontend)
- ✅ **Método de transferencia**: Requiere foto obligatoriamente
- ✅ **Tamaño de archivo**: Máximo 5MB
- ✅ **Tipo de archivo**: Solo imágenes
- ✅ **Token de sesión**: Verifica que el mesero esté autenticado
- ✅ **Estados de UI**: Deshabilita botones durante el procesamiento

### Servidor (Backend) - Recomendaciones
- ✅ Validar token JWT
- ✅ Verificar que la orden pertenezca al mesero
- ✅ Validar estado de la orden (debe ser "entregado")
- ✅ Guardar archivo en storage (S3, local, etc.)
- ✅ Actualizar orden a "por_verificar"
- ✅ Notificar al cajero/admin para revisión
- ✅ Registrar timestamp del pago

---

## 🐛 Manejo de Errores

### Error: No se puede acceder a la cámara
**Mensaje**: "No se pudo acceder a la cámara. Por favor suba un archivo."
**Causa**: Permisos denegados o navegador sin soporte
**Solución**: El `<input file>` permite seleccionar desde galería como fallback

### Error: Archivo muy grande
**Mensaje**: "El archivo es muy grande. Máximo 5MB"
**Causa**: Foto excede el límite
**Solución**: Comprimir la imagen o tomar otra con menor resolución

### Error: Sesión expirada
**Mensaje**: "Sesión expirada. Por favor inicie sesión nuevamente."
**Causa**: Token JWT inválido o expirado
**Solución**: Redirigir a login

### Error: Backend no responde
**Mensaje**: "Error al procesar el pago. Intente nuevamente."
**Causa**: API caída, red lenta, etc.
**Solución**: Reintentar, mostrar toast de error

---

## 📊 Estados de la Orden

### Flujo completo
```
pendiente → preparando → listo → entregado → por_verificar → pagado
                                      ↑           ↑             ↑
                                   Mesero      Cajero        Sistema
                                   cobra       revisa        confirma
```

### Estados relevantes para el cobro
| Estado | Descripción | Acción disponible |
|--------|-------------|-------------------|
| `entregado` | Comida entregada al cliente | ✅ **Mostrar botón "Cobrar"** |
| `por_verificar` | Pago registrado, pendiente de verificación | ⏳ Mostrar "En verificación" |
| `pagado` | Pago confirmado por cajero | ✅ Mostrar "Pagado" |

---

## 🎯 Casos de Uso

### Caso 1: Cliente paga exacto en efectivo
1. Abre modal → Tab "Efectivo"
2. Recibe el dinero
3. Confirma → Listo ✅

**Tiempo estimado**: 10 segundos

---

### Caso 2: Cliente transfiere (happy path)
1. Abre modal → Tab "Transferencia"
2. Cliente transfiere
3. Toma foto del comprobante
4. Revisa previsualización (OK)
5. Envía → Listo ✅

**Tiempo estimado**: 30 segundos

---

### Caso 3: Foto sale borrosa (retry)
1. Abre modal → Tab "Transferencia"
2. Toma foto borrosa
3. Ve previsualización (MAL) 🗑️
4. Elimina la foto
5. Retoma la foto (BIEN) ✅
6. Envía → Listo ✅

**Tiempo estimado**: 45 segundos

---

### Caso 4: Cliente no ha transferido aún
1. Abre modal → Tab "Transferencia"
2. Lee instrucciones al cliente
3. Cliente dice "ya transferí"
4. Toma foto → Envía ✅
5. *Cajero valida en backend que efectivamente llegó el dinero*

**Tiempo estimado**: 60 segundos

---

## 🔧 Personalización (Futuras mejoras)

### Prioridad Alta
- [ ] **Toast de confirmación**: En lugar de cerrar silenciosamente, mostrar "✅ Pago registrado correctamente"
- [ ] **Sonido de éxito**: Feedback auditivo al confirmar
- [ ] **Vibración táctil**: En dispositivos móviles

### Prioridad Media
- [ ] **Calculadora de cambio**: Para pagos en efectivo
- [ ] **Compresión de imagen**: Reducir tamaño antes de enviar
- [ ] **Múltiples fotos**: Permitir adjuntar frente y reverso del comprobante
- [ ] **OCR**: Extraer monto del comprobante automáticamente

### Prioridad Baja
- [ ] **Zoom en previsualización**: Permitir hacer zoom para verificar detalles
- [ ] **Filtros de imagen**: Mejorar contraste/brillo de la foto
- [ ] **Código QR**: Mostrar QR de pago en el modal
- [ ] **División de cuenta**: Permitir cobros parciales

---

## 📱 Compatibilidad

### Navegadores Móviles
- ✅ **Chrome Android**: Soporte completo
- ✅ **Safari iOS**: Soporte completo (iOS 11+)
- ✅ **Firefox Android**: Soporte completo
- ✅ **Samsung Internet**: Soporte completo

### Navegadores Desktop (Fallback)
- ⚠️ **Chrome/Edge**: Funciona pero sin cámara, permite seleccionar archivos
- ⚠️ **Firefox**: Funciona pero sin cámara, permite seleccionar archivos
- ⚠️ **Safari macOS**: Funciona con cámara integrada (MacBooks)

---

## 🎓 Tips para Capacitación de Meseros

### ✅ DO (Hacer)
- Pedir al cliente que muestre la pantalla con el comprobante
- Tomar la foto con buena iluminación
- Verificar que el monto sea visible en la foto
- Verificar que la fecha/hora sea visible
- Confirmar el pago solo después de ver la evidencia

### ❌ DON'T (No hacer)
- No confirmar pagos sin ver comprobante (en transferencias)
- No aceptar capturas borrosas
- No aceptar "ya te muestro luego"
- No dar cambio antes de confirmar el monto recibido

---

## 🆘 Soporte

### Para meseros
- **Problema técnico**: Contactar al administrador o cajero
- **Cliente reclama**: Mostrar que el pago está en "verificación"
- **App no responde**: Reiniciar sesión

### Para desarrolladores
- **Archivo**: `/src/features/waiter/components/CheckoutModal.tsx`
- **API Endpoint**: `POST /api/orders/:id/payment-proof`
- **Logs**: Verificar console.error en navegador

---

## ✅ Checklist de Implementación

### Frontend ✅
- [x] Componente CheckoutModal creado
- [x] Integración con PaymentsSlide
- [x] Integración con WaiterDashboard
- [x] Manejo de estados de carga
- [x] Validaciones de formulario
- [x] Previsualización de imagen
- [x] Manejo de errores
- [x] Limpieza de memoria

### Backend (Pendiente de verificar)
- [ ] Endpoint de payment-proof implementado
- [ ] Validación de token
- [ ] Storage de archivos configurado
- [ ] Actualización de estado de orden
- [ ] Notificaciones al cajero

### Testing (Pendiente)
- [ ] Test unitarios del modal
- [ ] Test de integración con API
- [ ] Test en dispositivos reales
- [ ] Test de límites (archivos grandes, red lenta)

---

**¡El modal está listo para revolucionar los cobros en TurnyChain! 🚀💳**

