// =================================================================
// ARCHIVO: /src/hooks/useCashierWebSocket.ts
// Hook personalizado para el Cajero con notificaciones en tiempo real
// =================================================================
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { orderUpdated, fetchActiveOrders } from '../features/shared/orders/api/ordersSlice';
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

export const useCashierWebSocket = (
  onNotification?: (options: NotificationOptions) => void
) => {
  const dispatch = useDispatch<AppDispatch>();
  const ws = useRef<WebSocket | null>(null);
  const heartbeatInterval = useRef<number | null>(null);

  useEffect(() => {
    // Solo conectar si es cajero
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'cajero') {
      console.log('⚠️ useCashierWebSocket: Usuario no es cajero, omitiendo conexión');
      return;
    }

    if (!ws.current) {
      const userId = localStorage.getItem('user_id') || 'unknown';
      const userRole = localStorage.getItem('user_role') || 'unknown';

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/ws?user_id=${userId}&role=${userRole}`;

      console.log(`🔌 [Cajero] Conectando WebSocket como ${userRole} (${userId})`);

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ [Cajero] WebSocket conectado exitosamente');

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
          console.log('📨 [Cajero] Mensaje recibido:', message);

          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ [Cajero] Error al parsear mensaje:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ [Cajero] Error en WebSocket:', error);
      };

      ws.current.onclose = () => {
        console.log('👋 [Cajero] WebSocket desconectado');
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }
      };
    }

    const handleWebSocketMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'PAYMENT_VERIFICATION_PENDING':
          handlePaymentVerificationPending(message.payload);
          break;

        case 'ORDER_READY_FOR_PAYMENT':
          handleOrderReadyForPayment(message.payload);
          break;

        case 'ORDER_UPDATED':
          handleOrderUpdate(message.payload);
          break;

        case 'ORDER_STATUS_UPDATED':
          handleOrderStatusUpdate(message.payload);
          break;

        case 'NEW_PENDING_ORDER':
          console.log('🆕 [Cajero] Nueva orden pendiente:', message.payload);
          if (message.payload) {
            dispatch(orderUpdated(message.payload as Order));
          }
          break;

        default:
          console.log('📬 [Cajero] Evento no manejado:', message.type);
      }
    };

    const handlePaymentVerificationPending = (payload: unknown) => {
      console.log('🔔 [Cajero] Nueva verificación de pago:', payload);

      const data = payload as { order?: Order; table_number?: number; method?: string; total?: number; action?: string };
      const order = data.order;
      if (order) {
        // Actualizar Redux
        dispatch(orderUpdated(order as Order));

        // Notificación visual
        if (onNotification) {
          const isResubmit = data.action === 'resubmitted';
          onNotification({
            title: isResubmit ? '🔄 Pago Reenviado' : '🔔 Nueva Verificación de Pago',
            message: `Mesa ${data.table_number} - ${data.method} ($${data.total})`,
            type: 'info'
          });
        }

        // Reproducir sonido
        playNotificationSound();

        // Recargar órdenes para asegurar sincronización
        dispatch(fetchActiveOrders());
      }
    };

    const handleOrderReadyForPayment = (payload: unknown) => {
      console.log('💰 [Cajero] Orden lista para cobrar:', payload);

      const data = payload as { order?: Order; table_number?: number; total?: number };
      const order = data.order;
      if (order) {
        dispatch(orderUpdated(order as Order));

        if (onNotification) {
          onNotification({
            title: '💰 Orden Lista para Cobrar',
            message: `Mesa ${data.table_number} - $${data.total}`,
            type: 'success'
          });
        }

        dispatch(fetchActiveOrders());
      }
    };

    const handleOrderUpdate = (order: unknown) => {
      console.log('📊 [Cajero] Orden actualizada:', order);

      if (order) {
        dispatch(orderUpdated(order as Order));
        dispatch(fetchActiveOrders());
      }
    };

    const handleOrderStatusUpdate = (order: unknown) => {
      console.log('🔄 [Cajero] Estado actualizado:', order);

      const orderData = order as Order;
      if (orderData) {
        dispatch(orderUpdated(orderData));

        // Notificar si la orden fue pagada
        if (orderData.status === 'pagado') {
          if (onNotification) {
            onNotification({
              title: '✅ Pago Verificado',
              message: `Mesa ${orderData.table_number} - Pago aprobado`,
              type: 'success'
            });
          }
        }

        dispatch(fetchActiveOrders());
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

