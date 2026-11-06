import axios from 'axios';

const API_URL = '/api/inventory/managed-stock';
export interface ManagedStockItem {
  id: string; name: string; category_id: string; category_name: string; quantity: number;
  warehouse_quantity: number; display_quantity: number;
}
const auth = (token: string) => ({ headers: { Authorization: 'Bearer ' + token } });
export const getManagedStock = async (token: string): Promise<ManagedStockItem[]> =>
  (await axios.get<ManagedStockItem[]>(API_URL, auth(token))).data;
export interface StockReceiptLine { item_id: string; quantity: number; unit_cost: number; }
export const updateManagedStockLocations = async (id: string, warehouse_quantity: number, display_quantity: number, token: string) =>
  axios.put(`${API_URL}/${id}/locations`, { warehouse_quantity, display_quantity }, auth(token));
export const receiveManagedStock = async (supplier_name: string, notes: string, lines: StockReceiptLine[], token: string) =>
  axios.post(`${API_URL}/receipts`, { supplier_name, notes, lines }, auth(token));
