import axios from 'axios';
import type { CashierSession, CashierExpense } from '../types/cajaTypes';

/**
 * Abre una nueva sesión de caja con el fondo inicial indicado.
 */
export const openCashierSession = async (
  token: string,
  initialFund: number
): Promise<CashierSession> => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };
  const response = await axios.post('/api/cashier/session/open', { initial_fund: initialFund }, config);
  return response.data;
};

/**
 * Obtiene los detalles de la sesión de caja abierta actualmente.
 * Retorna null si la caja está cerrada.
 */
export const fetchActiveCashierSession = async (
  token: string
): Promise<CashierSession | null> => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };
  const response = await axios.get('/api/cashier/session/active', config);
  return response.data;
};

/**
 * Registra un egreso/gasto para el turno de caja actual.
 * Admite de forma opcional una imagen de comprobante física (multipart).
 */
export const createCashierExpense = async (
  token: string,
  amount: number,
  description: string,
  file: File | null
): Promise<CashierExpense> => {
  const config = {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
  };
  
  const formData = new FormData();
  formData.append('amount', String(amount));
  formData.append('description', description);
  if (file) {
    formData.append('file', file);
  }

  const response = await axios.post('/api/cashier/session/expense', formData, config);
  return response.data;
};

/**
 * Cierra la sesión de caja activa, registrando el arqueo final.
 */
export const closeCashierSession = async (
  token: string,
  actualCash: number,
  notes: string
): Promise<CashierSession> => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };
  const response = await axios.post('/api/cashier/session/close', { actual_cash: actualCash, notes }, config);
  return response.data;
};
