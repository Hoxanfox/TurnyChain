// =================================================================
// ARCHIVO 2: /src/features/menu/menuAPI.ts (ACTUALIZADO)
// =================================================================
import axios from 'axios';
import type { MenuItem } from '../../types/menu';

const API_URL = '/api/menu';

// Payload para crear/actualizar un ítem del menú
export interface MenuItemPayload {
    name: string;
    description: string;
    price: number;
    category_id: string;
    ingredient_ids: string[];
    accompaniment_ids: string[];
}

export const getMenuItems = async (token: string): Promise<MenuItem[]> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const createMenuItem = async (itemData: MenuItemPayload, token: string): Promise<MenuItem> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.post(API_URL, itemData, config);
    return response.data;
};

export const updateMenuItem = async (id: string, itemData: MenuItemPayload, token: string): Promise<MenuItem> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.put(`${API_URL}/${id}`, itemData, config);
    return response.data;
};

export const deleteMenuItem = async (itemId: string, token: string): Promise<{ id: string }> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    await axios.delete(`${API_URL}/${itemId}`, config);
    return { id: itemId };
};