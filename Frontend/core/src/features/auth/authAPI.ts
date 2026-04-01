// =================================================================
// ARCHIVO 2: /src/features/auth/authAPI.ts (CORREGIDO)
// =================================================================
import axios from 'axios';
import type { LoginCredentials } from '../../types/auth';

// CORRECCIÓN: Usamos una ruta relativa. Nginx se encargará del resto.
const API_URL = '/api/auth';

export const loginUser = async (credentials: LoginCredentials): Promise<{ token: string }> => {
  const response = await axios.post(`${API_URL}/login`, credentials);
  return response.data;
};

export const validateSession = async (token: string): Promise<{ valid: boolean; user_id: string; role: string }> => {
  const response = await axios.get(`${API_URL}/validate`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};