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

export interface MonthlySalesPoint {
  month: string;
  total: number;
  order_count: number;
}

export interface YearlySalesPoint {
  year: string;
  total: number;
  order_count: number;
}

export interface ProductSalesPoint {
  product_id: string;
  product_name: string;
  category_name: string;
  total_quantity: number;
  total_revenue: number;
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

export const getMonthlySales = async (from?: string, to?: string): Promise<MonthlySalesPoint[]> => {
  const response = await axios.get(`${API_URL}/invoices/monthly-sales`, {
    ...getAuthHeaders(), params: { from: from || undefined, to: to || undefined },
  });
  return response.data as MonthlySalesPoint[];
};

export const getYearlySales = async (from?: string, to?: string): Promise<YearlySalesPoint[]> => {
  const response = await axios.get(`${API_URL}/invoices/yearly-sales`, {
    ...getAuthHeaders(), params: { from: from || undefined, to: to || undefined },
  });
  return response.data as YearlySalesPoint[];
};

export const getProductSales = async (month: string): Promise<ProductSalesPoint[]> => {
  const response = await axios.get(`${API_URL}/orders/product-stats`, {
    ...getAuthHeaders(), params: { month },
  });
  return response.data as ProductSalesPoint[];
};
