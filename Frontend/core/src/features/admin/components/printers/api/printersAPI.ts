// =================================================================
// ARCHIVO: /src/features/admin/components/printers/api/printersAPI.ts
// API para gestión de impresoras
// =================================================================

import axios from 'axios';
import type { Printer, CreatePrinterRequest, UpdatePrinterRequest } from '../../../../../types/printers';

const API_URL = '/api/printers';

export const printersAPI = {
  // Obtener todas las impresoras
  getAll: async (): Promise<Printer[]> => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Obtener solo impresoras activas
  getActive: async (): Promise<Printer[]> => {
    const response = await axios.get(`${API_URL}/active`);
    return response.data;
  },

  // Obtener impresoras de una estación específica
  getByStation: async (stationId: string): Promise<Printer[]> => {
    const response = await axios.get(`/api/stations/${stationId}/printers`);
    return response.data;
  },

  // Crear impresora
  create: async (data: CreatePrinterRequest): Promise<Printer> => {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  // Actualizar impresora
  update: async (id: string, data: UpdatePrinterRequest): Promise<Printer> => {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  // Desactivar impresora (soft delete)
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`);
  },
};

