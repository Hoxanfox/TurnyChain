// =================================================================
// ARCHIVO 6: /src/features/ingredients/ingredientsAPI.ts
// =================================================================
import axios from 'axios';
import type { Ingredient } from '../../../../../types/ingredients.ts';

const API_URL_INGREDIENTS = '/api/ingredients';

export const getIngredients = async (token: string): Promise<Ingredient[]> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.get(API_URL_INGREDIENTS, config);
    return response.data;
};
export const createIngredient = async (name: string, token: string): Promise<Ingredient> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.post(API_URL_INGREDIENTS, { name }, config);
    return response.data;
};
export const updateIngredient = async (ingredient: Ingredient, token: string): Promise<Ingredient> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.put(`${API_URL_INGREDIENTS}/${ingredient.id}`, { name: ingredient.name }, config);
    return response.data;
};
export const deleteIngredient = async (id: string, token: string): Promise<{ id: string }> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    await axios.delete(`${API_URL_INGREDIENTS}/${id}`, config);
    return { id };
};
