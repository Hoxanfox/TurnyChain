// =================================================================
// ARCHIVO 3: /src/features/tables/tablesAPI.ts (NUEVO ARCHIVO)
// =================================================================
import axios from 'axios';
import type { Table } from '../../../../../types/tables.ts';

const API_URL = '/api/tables';

export const getTables = async (token: string): Promise<Table[]> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const createTable = async (tableNumber: number, token: string): Promise<Table> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.post(API_URL, { table_number: tableNumber }, config);
    return response.data;
};