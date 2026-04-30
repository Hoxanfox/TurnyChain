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
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);
  const refreshDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    // Solo conectar si es cajero
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'cajero') {
      console.log('⚠️ useCashierWebSocket: Usuario no es cajero, omitiendo conexión');
      return;
    }

    shouldReconnect.current = true;
    const userId = localStorage.getItem('user_id') || 'unknown';

    const scheduleActiveOrdersRefresh = (options?: { force?: boolean }) => {
      const force = options?.force === true;

      if (refreshDebounce.current) {
        clearTimeout(refreshDebounce.current);
      }

      refreshDebounce.current = setTimeout(() => {
        dispatch(fetchActiveOrders());
      }, force ? 120 : 250);
    };

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

        case 'ORDER_PRINT_STATUS_UPDATED':
          handleOrderPrintStatusUpdate(message.payload);
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
        if (onNotificationRef.current) {
          const isResubmit = data.action === 'resubmitted';
          onNotificationRef.current({
            title: isResubmit ? '🔄 Pago Reenviado' : '🔔 Nueva Verificación de Pago',
            message: `Mesa ${data.table_number} - ${data.method} ($${data.total})`,
            type: 'info'
          });
        }

        // Reproducir sonido
        playNotificationSound();

        // Recargar órdenes para asegurar sincronización
        scheduleActiveOrdersRefresh();
      }
    };

    const handleOrderReadyForPayment = (payload: unknown) => {
      console.log('💰 [Cajero] Orden lista para cobrar:', payload);

      const data = payload as { order?: Order; table_number?: number; total?: number };
      const order = data.order;
      if (order) {
        dispatch(orderUpdated(order as Order));

        if (onNotificationRef.current) {
          onNotificationRef.current({
            title: '💰 Orden Lista para Cobrar',
            message: `Mesa ${data.table_number} - $${data.total}`,
            type: 'success'
          });
        }

        scheduleActiveOrdersRefresh();
      }
    };

    const handleOrderUpdate = (order: unknown) => {
      console.log('📊 [Cajero] Orden actualizada:', order);

      if (order) {
        dispatch(orderUpdated(order as Order));
        scheduleActiveOrdersRefresh();
      }
    };

    const handleOrderStatusUpdate = (order: unknown) => {
      console.log('🔄 [Cajero] Estado actualizado:', order);

      const orderData = order as Order;
      if (orderData) {
        dispatch(orderUpdated(orderData));

        // Notificar si la orden fue pagada
        if (orderData.status === 'pagado') {
          if (onNotificationRef.current) {
            onNotificationRef.current({
              title: '✅ Pago Verificado',
              message: `Mesa ${orderData.table_number} - Pago aprobado`,
              type: 'success'
            });
          }
        }

        scheduleActiveOrdersRefresh();
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
          title: '⚠️ Impresion fallida',
          message: `Mesa ${orderData.table_number}: la comanda no se imprimio`,
          type: 'warning'
        });
      }

      scheduleActiveOrdersRefresh();
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

    const clearReconnectTimer = () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    const connectWebSocket = () => {
      if (
        ws.current?.readyState === WebSocket.OPEN ||
        ws.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      const currentRole = localStorage.getItem('user_role') || 'unknown';
      const currentUserID = localStorage.getItem('user_id') || userId;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/ws?user_id=${currentUserID}&role=${currentRole}`;

      console.log(`🔌 [Cajero] Conectando WebSocket como ${currentRole} (${currentUserID})`);

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ [Cajero] WebSocket conectado exitosamente');
        reconnectAttempts.current = 0;
        clearReconnectTimer();

        // Sincroniza datos al reconectar por si se perdieron eventos.
        scheduleActiveOrdersRefresh({ force: true });

        // Heartbeat
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }
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
          heartbeatInterval.current = null;
        }

        ws.current = null;

        if (!shouldReconnect.current) {
          return;
        }

        const nextAttempt = reconnectAttempts.current + 1;
        reconnectAttempts.current = nextAttempt;
        const delayMs = Math.min(1000 * Math.pow(2, nextAttempt - 1), 10000);

        console.log(`🔁 [Cajero] Reintentando WebSocket en ${delayMs}ms (intento ${nextAttempt})`);
        clearReconnectTimer();
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, delayMs);
      };
    };

    connectWebSocket();

    return () => {
      console.log('🧹 [Cajero] Limpiando WebSocket...');

      shouldReconnect.current = false;

      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }

      clearReconnectTimer();

      if (refreshDebounce.current) {
        clearTimeout(refreshDebounce.current);
        refreshDebounce.current = null;
      }

      if (ws.current && ws.current.readyState !== WebSocket.CLOSED && ws.current.readyState !== WebSocket.CLOSING) {
        ws.current.close();
      }

      ws.current = null;

      reconnectAttempts.current = 0;
    };
  }, [dispatch]);

  return ws.current;
};

