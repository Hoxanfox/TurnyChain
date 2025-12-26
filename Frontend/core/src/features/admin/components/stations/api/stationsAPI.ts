// =================================================================
// ARCHIVO: /src/features/admin/components/stations/api/stationsAPI.ts
// API para gestión de estaciones
// =================================================================

import axios from 'axios';
import type { Station, CreateStationRequest, UpdateStationRequest } from '../../../../../types/stations';

const API_URL = '/api/stations';

export const stationsAPI = {
  // Obtener todas las estaciones
  getAll: async (): Promise<Station[]> => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Obtener solo estaciones activas
  getActive: async (): Promise<Station[]> => {
    const response = await axios.get(`${API_URL}/active`);
    return response.data;
  },

  // Obtener una estación por ID
  getById: async (id: string): Promise<Station> => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  // Crear estación
  create: async (data: CreateStationRequest): Promise<Station> => {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  // Actualizar estación
  update: async (id: string, data: UpdateStationRequest): Promise<Station> => {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  // Desactivar estación (soft delete)
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`);
  },
};

