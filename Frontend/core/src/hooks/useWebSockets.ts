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
  // CORRECCIÓN: En el navegador, el tipo devuelto por setInterval es un número.
  const heartbeatInterval = useRef<number | null>(null);

  useEffect(() => {
    if (!ws.current) {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/ws`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Conectado al servidor de WebSockets');
        
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
          
          // Lógica para órdenes
          if (message.type === 'NEW_PENDING_ORDER') {
            dispatch(orderAdded(message.payload as Order));
          } else if (['ORDER_STATUS_UPDATED', 'ORDER_MANAGED'].includes(message.type)) {
            dispatch(orderUpdated(message.payload as Order));
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
        console.log('Desconectado del servidor de WebSockets');
        // Limpiar el intervalo si la conexión se cierra
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }
      };
    }

    return () => {
      // Limpiar el intervalo al desmontar el componente
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      ws.current = null;
    };
  }, [dispatch]);
};