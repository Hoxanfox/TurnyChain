// =================================================================
// ARCHIVO: /src/features/menu/menuAPI.ts (CORREGIDO)
// =================================================================
import axios from 'axios';
import type { MenuItem } from '../../types/menu';

// CORRECCIÓN: Usamos una ruta relativa. Nginx se encargará del resto.
const API_URL = '/api/menu';

export const getMenuItems = async (token: string): Promise<MenuItem[]> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(API_URL, config);
  return response.data;
};