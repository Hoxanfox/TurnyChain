// =================================================================
// ARCHIVO 5: /src/features/categories/categoriesAPI.ts (CRUD COMPLETO)
// =================================================================
import axios from 'axios';
import type { Category } from '../../../../../types/categories.ts';

const API_URL = '/api/categories';

export const getCategories = async (token: string): Promise<Category[]> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const createCategory = async (name: string, token: string, stationId?: string): Promise<Category> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const data: { name: string; station_id?: string } = { name };
    if (stationId) {
      data.station_id = stationId;
    }
    const response = await axios.post(API_URL, data, config);
    return response.data;
};

export const updateCategory = async (category: Category, token: string): Promise<Category> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const data: { name: string; station_id?: string } = { name: category.name };
    if (category.station_id) {
      data.station_id = category.station_id;
    }
    const response = await axios.put(`${API_URL}/${category.id}`, data, config);
    return response.data;
};

export const deleteCategory = async (id: string, token: string): Promise<{ id: string }> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    await axios.delete(`${API_URL}/${id}`, config);
    return { id };
};