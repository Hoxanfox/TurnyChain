import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export type SupplierInvoiceStatus = 'pendiente' | 'parcial' | 'pagada' | 'saldo_favor';

export interface SupplierInvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: 'efectivo' | 'transferencia' | 'otro';
  payment_date: string;
  reference?: string;
  notes?: string;
}

export interface SupplierInvoice {
  id: string;
  invoice_number: string;
  supplier_name: string;
  issue_date: string;
  due_date?: string;
  total: number;
  paid_total: number;
  balance: number;
  credit_balance: number;
  status: SupplierInvoiceStatus;
  notes?: string;
  attachment_path?: string;
  created_at: string;
  updated_at: string;
  payments: SupplierInvoicePayment[];
}

export interface SupplierInvoiceInput {
  invoice_number: string;
  supplier_name: string;
  issue_date: string;
  due_date?: string;
  total: number;
  notes?: string;
  attachment?: File | null;
}

export interface SupplierInvoicePaymentInput {
  amount: number;
  payment_method: 'efectivo' | 'transferencia' | 'otro';
  payment_date: string;
  reference?: string;
  notes?: string;
}

const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const invoiceForm = (input: SupplierInvoiceInput) => {
  const form = new FormData();
  const { attachment, ...data } = input;
  const normalizedData = {
    ...data,
    issue_date: `${input.issue_date}T00:00:00Z`,
    due_date: input.due_date ? `${input.due_date}T00:00:00Z` : undefined,
  };
  form.append('invoice_data', JSON.stringify(normalizedData));
  if (attachment) form.append('attachment', attachment);
  return form;
};

export const getSupplierInvoices = async (): Promise<SupplierInvoice[]> => {
  const response = await axios.get(`${API_URL}/supplier-invoices/`, authConfig());
  return response.data;
};

export const createSupplierInvoice = async (input: SupplierInvoiceInput): Promise<SupplierInvoice> => {
  const response = await axios.post(`${API_URL}/supplier-invoices/`, invoiceForm(input), authConfig());
  return response.data;
};

export const updateSupplierInvoice = async (id: string, input: SupplierInvoiceInput): Promise<SupplierInvoice> => {
  const response = await axios.put(`${API_URL}/supplier-invoices/${id}`, invoiceForm(input), authConfig());
  return response.data;
};

export const deleteSupplierInvoice = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/supplier-invoices/${id}`, authConfig());
};

export const addSupplierInvoicePayment = async (id: string, input: SupplierInvoicePaymentInput): Promise<SupplierInvoice> => {
  const response = await axios.post(`${API_URL}/supplier-invoices/${id}/payments`, { ...input, payment_date: `${input.payment_date}T00:00:00Z` }, authConfig());
  return response.data;
};

export const getSupplierInvoiceAttachmentUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};