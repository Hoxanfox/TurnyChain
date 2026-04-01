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
  orderId?: string;
}

export const useWaiterWebSocket = (
  onNotification?: (options: NotificationOptions) => void
) => {
  const dispatch = useDispatch<AppDispatch>();
  const ws = useRef<WebSocket | null>(null);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshByOrder = useRef<Record<string, number>>({});
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    // Solo conectar si es mesero
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'mesero') {
      console.log('⚠️ useWaiterWebSocket: Usuario no es mesero, omitiendo conexión');
      return;
    }

    const userId = localStorage.getItem('user_id') || 'unknown';
    const scheduleOrdersRefresh = (orderId?: string) => {
      if (orderId) {
        const now = Date.now();
        const lastRefresh = lastRefreshByOrder.current[orderId] || 0;

        // Evita doble refresh cuando llegan eventos consecutivos
        // de la misma orden (p. ej. ORDER_UPDATED y ORDER_PRINT_STATUS_UPDATED).
        if (now - lastRefresh < 2000) {
          return;
        }

        lastRefreshByOrder.current[orderId] = now;
      }

      if (refreshDebounce.current) {
        clearTimeout(refreshDebounce.current);
      }

      refreshDebounce.current = setTimeout(() => {
        dispatch(fetchMyOrders());
      }, 250);
    };

    if (!ws.current) {
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
        case 'NEW_PENDING_ORDER': {
          const orderPayload = message.payload as Order | undefined;
          if (orderPayload?.waiter_id === userId) {
            break;
          }
          scheduleOrdersRefresh();
          break;
        }

        case 'ORDER_STATUS_UPDATED':
          handleOrderStatusUpdate(message.payload);
          break;

        case 'ORDER_UPDATED':
          handleOrderUpdate(message.payload);
          break;

        case 'ORDER_ITEMS_UPDATED':
          handleOrderUpdate(message.payload);
          break;

        case 'ORDER_MANAGED':
          handleOrderUpdate(message.payload);
          break;

        case 'ORDER_PRINT_STATUS_UPDATED':
          handleOrderPrintStatusUpdate(message.payload);
          break;

        case 'PAYMENT_VERIFICATION_PENDING':
          console.log('⏳ [Mesero] Pago en verificación:', message.payload);
          if (message.payload.order) {
            dispatch(orderUpdated(message.payload.order as Order));
            scheduleOrdersRefresh((message.payload.order as Order).id);
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
          if (onNotificationRef.current) {
            onNotificationRef.current({
              title: '❌ Pago Rechazado',
              message: `Mesa ${orderData.table_number} - Por favor reenviar comprobante`,
              type: 'warning',
              orderId: orderData.id,
            });
          }
          playNotificationSound();
        }

        // Si la orden fue aprobada, notificar
        if (orderData.status === 'pagado') {
          if (onNotificationRef.current) {
            onNotificationRef.current({
              title: '✅ Pago Aprobado',
              message: `Mesa ${orderData.table_number} - Pago verificado exitosamente`,
              type: 'success',
              orderId: orderData.id,
            });
          }
        }

        scheduleOrdersRefresh(orderData.id);
      }
    };

    const handleOrderUpdate = (order: unknown) => {
      console.log('📊 [Mesero] Orden actualizada:', order);

      if (order) {
        const orderData = order as Order;
        dispatch(orderUpdated(orderData));
        scheduleOrdersRefresh(orderData.id);
      }
    };

    const handleOrderPrintStatusUpdate = (order: unknown) => {
      const orderData = order as Order;
      if (!orderData) {
        return;
      }

      dispatch(orderUpdated(orderData));

      if (orderData.print_status === 'failed' && onNotificationRef.current) {
        onNotificationRef.current({
          title: '❌ Error de impresion',
          message: `Mesa ${orderData.table_number}: la comanda no se pudo imprimir`,
          type: 'warning',
          orderId: orderData.id,
        });
      }

      if (orderData.print_status === 'printed' && onNotificationRef.current) {
        onNotificationRef.current({
          title: '✅ Comanda impresa',
          message: `Mesa ${orderData.table_number}: impresion confirmada`,
          type: 'success',
          orderId: orderData.id,
        });
      }

      scheduleOrdersRefresh(orderData.id);
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
      if (refreshDebounce.current) {
        clearTimeout(refreshDebounce.current);
        refreshDebounce.current = null;
      }
      lastRefreshByOrder.current = {};
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED && ws.current.readyState !== WebSocket.CLOSING) {
        ws.current.close();
      }
      ws.current = null;
    };
  }, [dispatch]);

  return ws.current;
};

