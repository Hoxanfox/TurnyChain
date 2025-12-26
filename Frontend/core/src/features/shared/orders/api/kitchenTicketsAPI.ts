// =================================================================
// ARCHIVO: /src/features/shared/orders/api/kitchenTicketsAPI.ts
// API para gestión de tickets de cocina
// =================================================================

import axios from 'axios';
import type {
  KitchenTicketsPreview,
  PrintKitchenTicketsRequest,
  PrintKitchenTicketsResponse,
} from '../../../../types/kitchen_tickets';

export const kitchenTicketsAPI = {
  // Vista previa de tickets sin imprimir
  preview: async (orderId: string): Promise<KitchenTicketsPreview> => {
    const response = await axios.get(`/api/orders/${orderId}/kitchen-tickets/preview`);
    return response.data;
  },

  // Imprimir tickets de cocina
  print: async (orderId: string, reprint = false): Promise<PrintKitchenTicketsResponse> => {
    const response = await axios.post<PrintKitchenTicketsResponse>(
      `/api/orders/${orderId}/kitchen-tickets/print`,
      { order_id: orderId, reprint }
    );
    return response.data;
  },
};

