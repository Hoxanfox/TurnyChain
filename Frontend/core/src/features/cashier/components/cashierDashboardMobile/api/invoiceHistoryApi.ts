import axios from 'axios';
import type { InvoiceHistoryItem } from '../types/invoiceHistoryTypes';

const API_URL = '/api/invoices/history';

interface InvoiceHistoryParams {
  token: string;
  query: string;
  limit: number;
  offset: number;
  day?: string;
  month?: string;
}

export const fetchInvoiceHistory = async ({
  token,
  query,
  limit,
  offset,
  day,
  month,
}: InvoiceHistoryParams): Promise<InvoiceHistoryItem[]> => {
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query || undefined,
      day: day || undefined,
      month: month || undefined,
      limit,
      offset,
    },
  };

  const response = await axios.get(API_URL, config);
  return response.data as InvoiceHistoryItem[];
};
