// =================================================================
// ARCHIVO 9: /src/features/accompaniments/accompanimentsAPI.ts
// =================================================================
import axios from 'axios';
import type { Accompaniment } from '../../types/accompaniments';

const API_URL_ACCOMPANIMENTS = '/api/accompaniments';

export const getAccompaniments = async (token: string): Promise<Accompaniment[]> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.get(API_URL_ACCOMPANIMENTS, config);
    return response.data;
};
export const createAccompaniment = async (data: { name: string, price: number }, token: string): Promise<Accompaniment> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.post(API_URL_ACCOMPANIMENTS, data, config);
    return response.data;
};
export const updateAccompaniment = async (accompaniment: Accompaniment, token: string): Promise<Accompaniment> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.put(`${API_URL_ACCOMPANIMENTS}/${accompaniment.id}`, { name: accompaniment.name, price: accompaniment.price }, config);
    return response.data;
};
export const deleteAccompaniment = async (id: string, token: string): Promise<{ id: string }> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    await axios.delete(`${API_URL_ACCOMPANIMENTS}/${id}`, config);
    return { id };
};