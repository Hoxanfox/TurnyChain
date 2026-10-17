import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export interface DailySalesPoint {
  date: string; // YYYY-MM-DD (hora Bogotá)
  total: number;
  order_count: number;
}

/**
 * Obtiene las ventas agregadas por día (órdenes pagadas) entre dos fechas.
 * Si no se envían fechas, el backend devuelve los últimos 365 días.
 */
export const getDailySales = async (from?: string, to?: string): Promise<DailySalesPoint[]> => {
  const response = await axios.get(`${API_URL}/invoices/daily-sales`, {
    ...getAuthHeaders(),
    params: {
      from: from || undefined,
      to: to || undefined,
    },
  });
  return response.data as DailySalesPoint[];
};
