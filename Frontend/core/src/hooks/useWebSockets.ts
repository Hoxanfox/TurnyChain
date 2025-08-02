// =================================================================
// ARCHIVO 4: /src/hooks/useWebSockets.ts (NUEVO ARCHIVO)
// Propósito: Centralizar la lógica de conexión WebSocket.
// =================================================================
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { orderAdded, orderUpdated } from '../features/orders/ordersSlice';
import type { AppDispatch } from '../app/store';
import type { Order } from '../types/orders';

export const useWebSockets = () => {
  const dispatch = useDispatch<AppDispatch>();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!ws.current) {
      ws.current = new WebSocket('ws://localhost:8080/ws');

      ws.current.onopen = () => console.log('Conectado al servidor de WebSockets');
      
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'NEW_PENDING_ORDER') {
            dispatch(orderAdded(message.payload as Order));
          } else if (['ORDER_STATUS_UPDATED', 'ORDER_MANAGED'].includes(message.type)) {
            dispatch(orderUpdated(message.payload as Order));
          }
        } catch (error) {
          console.error('Error al parsear el mensaje del WebSocket:', error);
        }
      };

      ws.current.onclose = () => console.log('Desconectado del servidor de WebSockets');
    }

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      ws.current = null;
    };
  }, [dispatch]);
};