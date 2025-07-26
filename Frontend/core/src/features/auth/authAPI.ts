// =================================================================
// ARCHIVO 2: /src/features/auth/authAPI.ts
// Propósito: Contener las funciones que llaman a la API de autenticación.
// =================================================================
import axios from 'axios';
import type { LoginCredentials } from '../../types/auth';

const API_URL = 'http://localhost:8080/api/auth';

export const loginUser = async (credentials: LoginCredentials): Promise<{ token: string }> => {
  const response = await axios.post(`${API_URL}/login`, credentials);
  return response.data;
};
