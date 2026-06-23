import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface CashRegisterSession {
  id: string;
  status: 'open' | 'closed' | 'pending_close';
  open_time: string;
  close_time?: string;
  initial_cash: number;
  initial_transfer: number;
  final_cash_expected?: number;
  final_cash_actual?: number;
  discrepancy?: number;
  final_transfer_expected?: number;
  final_transfer_actual?: number;
  transfer_discrepancy?: number;
  created_at: string;
  updated_at: string;
}

export interface CashRegisterExpense {
  id: string;
  session_id: string;
  amount: number;
  description: string;
  image_path?: string;
  created_at: string;
}

export interface CashRegisterSessionDetails {
  session: CashRegisterSession | null;
  expenses: CashRegisterExpense[];
  total_cash_sales: number;
  total_transfer: number;
  total_expenses: number;
  expected_cash: number;
  cash_transactions_count: number;
  transfer_transactions_count: number;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const openSession = async (initialCash: number, initialTransfer: number): Promise<CashRegisterSession> => {
  const response = await axios.post(`${API_URL}/cash-register/open`, { 
    initial_cash: initialCash,
    initial_transfer: initialTransfer
  }, getAuthHeaders());
  return response.data;
};

export const getCurrentSessionDetails = async (): Promise<CashRegisterSessionDetails> => {
  const response = await axios.get(`${API_URL}/cash-register/current`, getAuthHeaders());
  return response.data;
};

export const addExpense = async (amount: number, description: string, image?: File): Promise<CashRegisterExpense> => {
  const formData = new FormData();
  formData.append('amount', amount.toString());
  formData.append('description', description);
  if (image) {
    formData.append('image', image);
  }

  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/cash-register/expenses`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      // NO establecer Content-Type para dejar que el navegador ponga la boundary correcta
    },
  });
  return response.data;
};

export const closeSession = async (finalCashActual: number, finalTransferActual: number, justification?: string): Promise<CashRegisterSession> => {
  const response = await axios.post(`${API_URL}/cash-register/close`, { 
    final_cash_actual: finalCashActual,
    final_transfer_actual: finalTransferActual,
    justification: justification
  }, getAuthHeaders());
  return response.data;
};
