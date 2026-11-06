import axios from 'axios';
import type { Category } from '../../../../../types/categories.ts';

const API_URL = '/api/categories';
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getCategories = async (token: string): Promise<Category[]> => {
  const response = await axios.get<Category[]>(API_URL, auth(token));
  return response.data;
};

export const createCategory = async (name: string, token: string, stationId?: string, tracksStock = false): Promise<Category> => {
  const response = await axios.post<Category>(API_URL, { name, station_id: stationId || undefined, tracks_stock: tracksStock }, auth(token));
  return response.data;
};

export const updateCategory = async (category: Category, token: string): Promise<Category> => {
  const response = await axios.put<Category>(`${API_URL}/${category.id}`, {
    name: category.name,
    station_id: category.station_id || undefined,
    tracks_stock: category.tracks_stock,
  }, auth(token));
  return response.data;
};

export const deleteCategory = async (id: string, token: string): Promise<{ id: string }> => {
  await axios.delete(`${API_URL}/${id}`, auth(token));
  return { id };
};
