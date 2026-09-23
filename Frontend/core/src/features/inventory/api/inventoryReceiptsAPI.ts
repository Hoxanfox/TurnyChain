import axios from 'axios';

const API_URL = '/api/inventory/receipts/';

export type InventoryUnit = 'kg' | 'g' | 'lb' | 'unidad' | 'caja';

export interface InventoryReceiptLinePayload {
  item_name: string;
  quantity: number;
  portions?: number[];
  unit: InventoryUnit;
  unit_cost: number;
}

export interface CreateInventoryReceiptPayload {
  supplier_name: string;
  notes: string;
  lines: InventoryReceiptLinePayload[];
}

export interface InventoryReceiptLine extends InventoryReceiptLinePayload {
  id: string;
  line_total: number;
}

export interface InventoryReceipt {
  id: string;
  receipt_number: string;
  received_by: string;
  supplier_name: string;
  notes?: string;
  status: string;
  total: number;
  created_at: string;
  lines: InventoryReceiptLine[];
}

export interface InventoryStock {
  item_name: string;
  unit: InventoryUnit;
  quantity: number;
  total_cost: number;
  updated_at: string;
}

export const createInventoryReceipt = async (
  payload: CreateInventoryReceiptPayload,
  token: string
): Promise<InventoryReceipt> => {
  const response = await axios.post<InventoryReceipt>(API_URL, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getInventoryStock = async (token: string): Promise<InventoryStock[]> => {
  const response = await axios.get<InventoryStock[]>('/api/inventory/stock', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getInventoryReceipts = async (token: string): Promise<InventoryReceipt[]> => {
  const response = await axios.get<InventoryReceipt[]>(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateInventoryReceipt = async (
  receiptId: string,
  payload: CreateInventoryReceiptPayload,
  token: string
): Promise<InventoryReceipt> => {
  const response = await axios.put<InventoryReceipt>(`${API_URL}${receiptId}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteInventoryReceipt = async (receiptId: string, token: string): Promise<void> => {
  await axios.delete(`${API_URL}${receiptId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getInventoryDraft = async (token: string): Promise<CreateInventoryReceiptPayload | null> => {
  try {
    const response = await axios.get<CreateInventoryReceiptPayload>(`${API_URL}draft`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

export const saveInventoryDraft = async (
  payload: CreateInventoryReceiptPayload,
  token: string
): Promise<void> => {
  await axios.put(`${API_URL}draft`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const clearInventoryDraft = async (token: string): Promise<void> => {
  await axios.delete(`${API_URL}draft`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};