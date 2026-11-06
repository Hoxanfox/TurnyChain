import axios from 'axios';

const API_URL = '/api/inventory/managed-stock';

export interface ManagedStockItem {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  quantity: number;
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getManagedStock = async (token: string): Promise<ManagedStockItem[]> => {
  const response = await axios.get<ManagedStockItem[]>(API_URL, auth(token));
  return response.data;
};

export const setManagedStock = async (id: string, quantity: number, token: string): Promise<void> => {
  await axios.put(`${API_URL}/${id}`, { quantity }, auth(token));
};

export const clearManagedStock = async (id: string, token: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`, auth(token));
};
