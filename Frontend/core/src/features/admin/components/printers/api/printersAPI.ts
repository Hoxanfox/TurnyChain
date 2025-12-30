// =================================================================
// ARCHIVO: /src/features/admin/components/printers/api/printersAPI.ts
// API para gestión de impresoras
// =================================================================

import axios from 'axios';
import type { Printer, CreatePrinterRequest, UpdatePrinterRequest } from '../../../../../types/printers';

const API_URL = '/api/printers';

// Función helper para obtener el token del localStorage
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const printersAPI = {
  // Obtener todas las impresoras
  getAll: async (): Promise<Printer[]> => {
    const response = await axios.get(API_URL, getAuthConfig());
    return response.data;
  },

  // Obtener solo impresoras activas
  // NOTA: Comentado por no estar en uso. Descomentar si se necesita en el futuro.
  /*
  getActive: async (): Promise<Printer[]> => {
    const response = await axios.get(`${API_URL}/active`, getAuthConfig());
    return response.data;
  },
  */

  // Obtener impresoras de una estación específica
  // NOTA: Comentado por no estar en uso. Descomentar si se necesita en el futuro.
  /*
  getByStation: async (stationId: string): Promise<Printer[]> => {
    const response = await axios.get(`/api/stations/${stationId}/printers`, getAuthConfig());
    return response.data;
  },
  */

  // Crear impresora
  create: async (data: CreatePrinterRequest): Promise<Printer> => {
    const response = await axios.post(API_URL, data, getAuthConfig());
    return response.data;
  },

  // Actualizar impresora
  update: async (id: string, data: UpdatePrinterRequest): Promise<Printer> => {
    const response = await axios.put(`${API_URL}/${id}`, data, getAuthConfig());
    return response.data;
  },

  // Desactivar impresora (soft delete)
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`, getAuthConfig());
  },
};

