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

  // Reintentar impresión completa desde backend (solo cajero)
  retryPrint: async (orderId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post<{ success: boolean; message: string }>(
        `/api/orders/${orderId}/kitchen-tickets/retry`,
        { order_id: orderId },
        getAuthConfig()
      );
      return response.data;
    } catch (error: any) {
      // Compatibilidad con despliegues que aun no exponen /retry.
      if (error?.response?.status === 404) {
        const printResponse = await axios.post<PrintKitchenTicketsResponse>(
          `/api/orders/${orderId}/kitchen-tickets/print`,
          { order_id: orderId, reprint: true },
          getAuthConfig()
        );

        return {
          success: printResponse.data?.success ?? true,
          message: 'Ruta de reintento no disponible; se ejecuto reimpresion directa.',
        };
      }

      throw error;
    }
  },

  retryRecentFailed: async (options?: {
    table_number?: number;
    lookback_minutes?: number;
    cooldown_minutes?: number;
    max_attempts?: number;
  }): Promise<{
    success: boolean;
    target: string;
    selected_orders: number;
    queued_orders: number;
    message: string;
  }> => {
    const response = await axios.post(
      '/api/orders/kitchen-tickets/retry-failed-recent',
      options || {},
      getAuthConfig()
    );
    return response.data;
  },
};

