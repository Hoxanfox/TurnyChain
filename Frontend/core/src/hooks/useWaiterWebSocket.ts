// =================================================================
// ARCHIVO: /src/hooks/useWaiterWebSocket.ts
// Hook personalizado para el Mesero con notificaciones en tiempo real
// =================================================================
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { orderUpdated, fetchMyOrders } from '../features/shared/orders/api/ordersSlice';
import type { AppDispatch } from '../app/store';
import type { Order } from '../types/orders';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface NotificationOptions {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const useWaiterWebSocket = (
  onNotification?: (options: NotificationOptions) => void
) => {
  const dispatch = useDispatch<AppDispatch>();
  const ws = useRef<WebSocket | null>(null);
  const heartbeatInterval = useRef<number | null>(null);

  useEffect(() => {
    // Solo conectar si es mesero
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'mesero') {
      console.log('⚠️ useWaiterWebSocket: Usuario no es mesero, omitiendo conexión');
      return;
    }

    if (!ws.current) {
      const userId = localStorage.getItem('user_id') || 'unknown';
      const userRole = localStorage.getItem('user_role') || 'unknown';

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/ws?user_id=${userId}&role=${userRole}`;

      console.log(`🔌 [Mesero] Conectando WebSocket como ${userRole} (${userId})`);

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ [Mesero] WebSocket conectado exitosamente');

        // Heartbeat
        heartbeatInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 [Mesero] Mensaje recibido:', message);

          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ [Mesero] Error al parsear mensaje:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ [Mesero] Error en WebSocket:', error);
      };

      ws.current.onclose = () => {
        console.log('👋 [Mesero] WebSocket desconectado');
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }
      };
    }

    const handleWebSocketMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'ORDER_STATUS_UPDATED':
          handleOrderStatusUpdate(message.payload);
          break;

        case 'ORDER_UPDATED':
          handleOrderUpdate(message.payload);
          break;

        case 'PAYMENT_VERIFICATION_PENDING':
          console.log('⏳ [Mesero] Pago en verificación:', message.payload);
          if (message.payload.order) {
            dispatch(orderUpdated(message.payload.order as Order));
            dispatch(fetchMyOrders());
          }
          break;

        default:
          console.log('📬 [Mesero] Evento:', message.type);
      }
    };

    const handleOrderStatusUpdate = (order: unknown) => {
      console.log('🔄 [Mesero] Estado de orden actualizado:', order);

      const orderData = order as Order;
      if (orderData) {
        dispatch(orderUpdated(orderData));

        // Si la orden fue rechazada, notificar
        if (orderData.status === 'entregado' && orderData.payment_method) {
          if (onNotification) {
            onNotification({
              title: '❌ Pago Rechazado',
              message: `Mesa ${orderData.table_number} - Por favor reenviar comprobante`,
              type: 'warning'
            });
          }
          playNotificationSound();
        }

        // Si la orden fue aprobada, notificar
        if (orderData.status === 'pagado') {
          if (onNotification) {
            onNotification({
              title: '✅ Pago Aprobado',
              message: `Mesa ${orderData.table_number} - Pago verificado exitosamente`,
              type: 'success'
            });
          }
        }

        dispatch(fetchMyOrders());
      }
    };

    const handleOrderUpdate = (order: unknown) => {
      console.log('📊 [Mesero] Orden actualizada:', order);

      if (order) {
        dispatch(orderUpdated(order as Order));
        dispatch(fetchMyOrders());
      }
    };

    const playNotificationSound = () => {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(err =>
          console.warn('No se pudo reproducir sonido:', err)
        );
      } catch (error) {
        console.warn('Error al reproducir sonido:', error);
      }
    };

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      ws.current = null;
    };
  }, [dispatch, onNotification]);

  return ws.current;
};

