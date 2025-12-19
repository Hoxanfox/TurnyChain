# 🔌 Actualización de Frontend - Conexión WebSocket con Roles

## 📅 Fecha: 18 de Diciembre de 2024

## 🎯 Cambios Requeridos en el Frontend

### 1. **Actualizar la Conexión WebSocket**

#### Ubicación: `src/services/websocket.ts` (o donde esté tu conexión WebSocket)

```typescript
// ❌ ANTES (sin rol ni user_id)
export function connectWebSocket() {
  const ws = new WebSocket('ws://localhost:8080/ws');
  
  ws.onopen = () => {
    console.log('WebSocket conectado');
  };
  
  return ws;
}
```

```typescript
// ✅ AHORA (con rol y user_id)
export function connectWebSocket() {
  // Obtener datos del usuario desde localStorage o contexto
  const userId = localStorage.getItem('user_id') || 'unknown';
  const userRole = localStorage.getItem('user_role') || 'unknown';
  
  // Construir URL con query params
  const wsUrl = `ws://localhost:8080/ws?user_id=${userId}&role=${userRole}`;
  
  console.log(`🔌 Conectando WebSocket como ${userRole} (${userId})`);
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ WebSocket conectado exitosamente');
    console.log(`   - Role: ${userRole}`);
    console.log(`   - UserID: ${userId}`);
  };
  
  ws.onerror = (error) => {
    console.error('❌ Error en WebSocket:', error);
  };
  
  ws.onclose = () => {
    console.log('👋 WebSocket desconectado');
  };
  
  return ws;
}
```

### 2. **Agregar Listeners para Nuevos Eventos**

#### Ubicación: `src/pages/CashierDashboard.tsx` (o componente del cajero)

```typescript
import { useEffect, useState } from 'react';
import { connectWebSocket } from '../services/websocket';

export function CashierDashboard() {
  const [ordersToVerify, setOrdersToVerify] = useState([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Conectar WebSocket
    const websocket = connectWebSocket();
    setWs(websocket);

    // Escuchar mensajes
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('📨 Mensaje WebSocket recibido:', message);

      switch (message.type) {
        case 'PAYMENT_VERIFICATION_PENDING':
          console.log('🔔 Nueva orden para verificar:', message.payload);
          handleNewVerificationOrder(message.payload);
          break;

        case 'ORDER_READY_FOR_PAYMENT':
          console.log('💰 Orden lista para cobrar:', message.payload);
          handleOrderReadyForPayment(message.payload);
          break;

        case 'ORDER_UPDATED':
          console.log('📊 Orden actualizada:', message.payload);
          handleOrderUpdate(message.payload);
          break;

        case 'ORDER_STATUS_UPDATED':
          console.log('🔄 Estado cambiado:', message.payload);
          handleOrderStatusUpdate(message.payload);
          break;

        case 'NEW_PENDING_ORDER':
          console.log('🆕 Nueva orden pendiente:', message.payload);
          // Manejar si es relevante para el cajero
          break;

        default:
          console.log('📬 Evento no manejado:', message.type);
      }
    };

    // Cleanup al desmontar
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  const handleNewVerificationOrder = (payload: any) => {
    const order = payload.order;
    
    // ✅ Agregar orden a la lista de "Por Verificar"
    setOrdersToVerify(prev => {
      // Evitar duplicados
      const exists = prev.some(o => o.id === order.id);
      if (exists) {
        // Actualizar la orden existente
        return prev.map(o => o.id === order.id ? order : o);
      }
      // Agregar nueva orden al inicio
      return [order, ...prev];
    });

    // ✅ Mostrar notificación visual
    showNotification({
      title: '🔔 Nueva Verificación de Pago',
      message: `Mesa ${payload.table_number} - ${payload.method}`,
      type: 'info'
    });

    // ✅ Reproducir sonido (opcional)
    playNotificationSound();
  };

  const handleOrderReadyForPayment = (payload: any) => {
    const order = payload.order;
    
    console.log('💰 Orden lista para cobrar (ya tiene método de pago):', order);
    
    // Esta orden ya fue rechazada y ahora tiene un nuevo comprobante
    // O es una orden entregada que necesita cobro
    
    // Aquí puedes decidir si mostrarla en una sección especial
    // o agregarla directamente a "Por Verificar" si aplica
  };

  const handleOrderUpdate = (order: any) => {
    // Actualizar la orden en las listas correspondientes
    setOrdersToVerify(prev => 
      prev.map(o => o.id === order.id ? order : o)
    );

    // Si el estado cambió a algo que no requiere verificación, remover
    if (order.status !== 'por_verificar') {
      setOrdersToVerify(prev => 
        prev.filter(o => o.id !== order.id)
      );
    }
  };

  const handleOrderStatusUpdate = (order: any) => {
    // Similar a handleOrderUpdate
    handleOrderUpdate(order);
  };

  const showNotification = (options: any) => {
    // Implementar tu sistema de notificaciones
    console.log('🔔 Notificación:', options);
    
    // Ejemplo con una librería de notificaciones:
    // toast.info(options.message, { title: options.title });
  };

  const playNotificationSound = () => {
    // Reproducir sonido de notificación
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(err => console.error('Error reproduciendo sonido:', err));
  };

  return (
    <div>
      <h1>Cajero Dashboard</h1>
      
      <section>
        <h2>Por Verificar ({ordersToVerify.length})</h2>
        {ordersToVerify.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </section>
    </div>
  );
}
```

### 3. **Actualizar el Login para Guardar Role**

#### Ubicación: `src/services/authService.ts` o donde manejes el login

```typescript
export async function login(username: string, password: string) {
  const response = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  
  // ✅ Guardar en localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('user_id', data.user_id);      // ⚠️ IMPORTANTE
  localStorage.setItem('user_role', data.role);       // ⚠️ IMPORTANTE
  localStorage.setItem('username', data.username);

  console.log('✅ Login exitoso:', {
    user_id: data.user_id,
    role: data.role,
    username: data.username
  });

  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_role');
  localStorage.removeItem('username');
  
  console.log('👋 Logout exitoso');
}
```

### 4. **Componente de Mesero (Opcional pero Recomendado)**

#### Ubicación: `src/pages/WaiterDashboard.tsx` o similar

```typescript
export function WaiterDashboard() {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = connectWebSocket();
    setWs(websocket);

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'ORDER_STATUS_UPDATED':
          // Si mi orden fue actualizada (ej: rechazada por cajero)
          console.log('🔄 Estado de orden actualizado:', message.payload);
          handleOrderStatusUpdate(message.payload);
          break;

        case 'ORDER_UPDATED':
          console.log('📊 Orden actualizada:', message.payload);
          handleOrderUpdate(message.payload);
          break;

        default:
          console.log('📬 Evento:', message.type);
      }
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  const handleOrderStatusUpdate = (order: any) => {
    // Si la orden fue rechazada, mostrar notificación
    if (order.status === 'entregado' && order.payment_method) {
      showNotification({
        title: '❌ Pago Rechazado',
        message: `Mesa ${order.table_number} - Reenviar comprobante`,
        type: 'warning'
      });
    }
  };

  // ... resto del componente
}
```

## 🎨 Ejemplo de Notificación Visual

```typescript
// src/components/Notification.tsx
import { useEffect } from 'react';

interface NotificationProps {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose: () => void;
}

export function Notification({ title, message, type, duration = 5000, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    error: 'bg-red-500'
  };

  return (
    <div className={`fixed top-4 right-4 ${bgColors[type]} text-white p-4 rounded-lg shadow-lg z-50 animate-slide-in`}>
      <div className="flex items-start">
        <div className="flex-1">
          <h4 className="font-bold">{title}</h4>
          <p className="text-sm">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
          ✕
        </button>
      </div>
    </div>
  );
}
```

## 🧪 Testing

### Test Manual en Consola del Navegador

```javascript
// 1. Verificar que el WebSocket está conectado con los parámetros correctos
console.log('User ID:', localStorage.getItem('user_id'));
console.log('Role:', localStorage.getItem('user_role'));

// 2. Simular recepción de mensaje (para probar el handler)
const mockMessage = {
  type: 'PAYMENT_VERIFICATION_PENDING',
  payload: {
    order_id: '123-abc',
    table_number: 5,
    method: 'transferencia',
    total: 25000,
    action: 'resubmitted',
    order: { /* ... */ }
  }
};

// Enviar como si viniera del servidor
window.dispatchEvent(new MessageEvent('message', {
  data: JSON.stringify(mockMessage)
}));
```

## ✅ Checklist Frontend

- [ ] Actualizar conexión WebSocket con `user_id` y `role`
- [ ] Guardar `user_id` y `role` en login
- [ ] Implementar listener para `PAYMENT_VERIFICATION_PENDING`
- [ ] Implementar listener para `ORDER_READY_FOR_PAYMENT`
- [ ] Implementar listener para `ORDER_UPDATED`
- [ ] Implementar listener para `ORDER_STATUS_UPDATED`
- [ ] Agregar notificaciones visuales
- [ ] Agregar sonidos de notificación (opcional)
- [ ] Probar con mesero y cajero en ventanas separadas
- [ ] Verificar que no se requiere recargar página

## 🚀 Resultado Esperado

```
MESERO                           CAJERO
  │                                │
  ├─ Sube comprobante             │
  │  📤 Log: Enviando...           │
  │                                │
  │                                ├─ 🔔 Notificación recibida
  │                                ├─ 📊 Orden aparece en lista
  │                                ├─ 🔊 Sonido de notificación
  │                                │   (SIN RECARGAR PÁGINA)
  │                                │
  │                                ├─ Cajero rechaza
  │                                │
  ├─ 🔔 Notificación: Rechazado   │
  ├─ 📊 Botón "Reintentar"        │
  │                                │
  ├─ Reenvía comprobante          │
  │                                │
  │                                ├─ 🔔 Nueva notificación
  │                                ├─ 📊 Orden reaparece
  │                                │   (SIN RECARGAR PÁGINA)
```

---

**Estado:** 📝 **DOCUMENTACIÓN COMPLETA PARA FRONTEND**

**Última actualización:** 18 de Diciembre de 2024

