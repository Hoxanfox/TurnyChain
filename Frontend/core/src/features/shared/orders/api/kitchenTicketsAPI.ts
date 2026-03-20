// =================================================================
// ARCHIVO: /src/features/shared/orders/api/kitchenTicketsAPI.ts
// API para gestión de tickets de cocina
// =================================================================

import axios from 'axios';
import type {
  KitchenTicketsPreview,
  PrintKitchenTicketsResponse,
} from '../../../../types/kitchen_tickets';

// Función helper para obtener el token del localStorage
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const kitchenTicketsAPI = {
  // Vista previa completa de tickets (todas las estaciones)
  preview: async (orderId: string): Promise<KitchenTicketsPreview> => {
    const response = await axios.get(`/api/orders/${orderId}/kitchen-tickets/preview`, getAuthConfig());
    return response.data;
  },

  // Vista previa de tickets de una sola estación
  previewStation: async (orderId: string, stationId: string): Promise<KitchenTicketsPreview> => {
    const response = await axios.get(
      `/api/orders/${orderId}/kitchen-tickets/preview/station/${stationId}`,
      getAuthConfig()
    );
    return response.data;
  },

  // Imprimir tickets de todas las estaciones
  print: async (orderId: string, reprint = false): Promise<PrintKitchenTicketsResponse> => {
    const response = await axios.post<PrintKitchenTicketsResponse>(
      `/api/orders/${orderId}/kitchen-tickets/print`,
      { order_id: orderId, reprint },
      getAuthConfig()
    );
    return response.data;
  },

  // Imprimir tickets de una sola estación
  printStation: async (orderId: string, stationId: string, reprint = false): Promise<PrintKitchenTicketsResponse> => {
    const response = await axios.post<PrintKitchenTicketsResponse>(
      `/api/orders/${orderId}/kitchen-tickets/print/station/${stationId}`,
      { order_id: orderId, reprint },
      getAuthConfig()
    );
    return response.data;
  },

  // Imprimir ticket global en la estación Caja
  printCashierGlobal: async (orderId: string): Promise<PrintKitchenTicketsResponse> => {
    const response = await axios.post<PrintKitchenTicketsResponse>(
      `/api/orders/${orderId}/kitchen-tickets/print/caja`,
      { order_id: orderId },
      getAuthConfig()
    );
    return response.data;
  },
};

