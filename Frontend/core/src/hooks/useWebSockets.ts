// =================================================================
// ARCHIVO 1: /src/hooks/useWebSockets.ts (ACTUALIZADO)
// Propósito: Añadir un mecanismo de "heartbeat" para mantener la conexión viva.
// =================================================================
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { orderAdded, orderUpdated } from '../features/shared/orders/api/ordersSlice.ts';
import { menuItemAdded, menuItemUpdated, menuItemRemoved } from '../features/admin/components/menu/api/menuSlice.ts';
import type { AppDispatch } from '../app/store';
import type { Order } from '../types/orders';
import type { MenuItem } from '../types/menu';

export const useWebSockets = () => {
  const dispatch = useDispatch<AppDispatch>();
  const ws = useRef<WebSocket | null>(null);
  // CORRECCIÓN: Usar ReturnType para compatibilidad con Node.js y navegador
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    // ✅ Obtener rol del usuario
    const userRole = localStorage.getItem('user_role') || 'unknown';

    // ⚠️ No conectar si el rol tiene un hook específico (cajero, mesero)
    // Estos roles usan useCashierWebSocket y useWaiterWebSocket respectivamente
    if (userRole === 'cajero' || userRole === 'mesero') {
      console.log(`⚠️ [WebSocket] El rol '${userRole}' usa un hook específico. Omitiendo conexión global.`);
      return;
    }

    // Evitar múltiples conexiones simultáneas
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING || isConnecting.current) {
      console.log('⚠️ [WebSocket] Ya existe una conexión activa o en progreso');
      return;
    }

    isConnecting.current = true;

    // ✅ Obtener datos del usuario desde localStorage
    const userId = localStorage.getItem('user_id') || 'unknown';

    // ✅ Construir URL con query params para roles
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws?user_id=${userId}&role=${userRole}`;

    console.log(`🔌 Conectando WebSocket como ${userRole} (${userId})`);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('✅ WebSocket conectado exitosamente');
      console.log(`   - Role: ${userRole}`);
      console.log(`   - UserID: ${userId}`);
      isConnecting.current = false;

      // Iniciar el heartbeat para mantener la conexión viva
      heartbeatInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          // Enviamos un mensaje simple de tipo 'ping'
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Enviar un ping cada 30 segundos
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Mensaje WebSocket recibido:', message);

        // Lógica para órdenes
        if (message.type === 'NEW_PENDING_ORDER') {
          dispatch(orderAdded(message.payload as Order));
        } else if (['ORDER_STATUS_UPDATED', 'ORDER_MANAGED', 'ORDER_UPDATED'].includes(message.type)) {
          dispatch(orderUpdated(message.payload as Order));
        } else if (message.type === 'PAYMENT_VERIFICATION_PENDING') {
          // ✅ Nueva orden para verificar pago
          console.log('🔔 Nueva orden para verificar:', message.payload);
          if (message.payload.order) {
            dispatch(orderUpdated(message.payload.order as Order));
          }
        } else if (message.type === 'ORDER_READY_FOR_PAYMENT') {
          // ✅ Orden lista para cobrar
          console.log('💰 Orden lista para cobrar:', message.payload);
          if (message.payload.order) {
            dispatch(orderUpdated(message.payload.order as Order));
          }
        }

        // Lógica para el menú
        if (message.type === 'MENU_ITEM_ADDED') {
          dispatch(menuItemAdded(message.payload as MenuItem));
        } else if (message.type === 'MENU_ITEM_UPDATED') {
          dispatch(menuItemUpdated(message.payload as MenuItem));
        } else if (message.type === 'MENU_ITEM_DELETED') {
          dispatch(menuItemRemoved(message.payload as { id: string }));
        }

      } catch (error) {
        console.error('Error al parsear el mensaje del WebSocket:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('👋 WebSocket desconectado');
      isConnecting.current = false;
      // Limpiar el intervalo si la conexión se cierra
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };

    ws.current.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error);
      isConnecting.current = false;
    };

    return () => {
      console.log('🧹 [WebSocket] Limpiando conexión...');

      // Limpiar el intervalo al desmontar el componente
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }

      if (ws.current) {
        if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
          ws.current.close();
        }
        ws.current = null;
      }

      isConnecting.current = false;
    };
  }, [dispatch]);
};