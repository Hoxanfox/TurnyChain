// =================================================================
// ARCHIVO 1: /src/features/menu/menuAPI.ts (ACTUALIZADO)
// =================================================================
import axios from 'axios';
import type { MenuItem } from '../../types/menu';

const API_URL = '/api/menu';

export const getMenuItems = async (token: string): Promise<MenuItem[]> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const createMenuItem = async (itemData: Omit<MenuItem, 'id' | 'is_available'>, token: string): Promise<MenuItem> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.post(API_URL, itemData, config);
    return response.data;
};

export const updateMenuItem = async (itemData: MenuItem, token: string): Promise<MenuItem> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const { id, ...updateData } = itemData;
    const response = await axios.put(`${API_URL}/${id}`, updateData, config);
    return response.data;
};

export const deleteMenuItem = async (itemId: string, token: string): Promise<{ id: string }> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    await axios.delete(`${API_URL}/${itemId}`, config);
    return { id: itemId };
};