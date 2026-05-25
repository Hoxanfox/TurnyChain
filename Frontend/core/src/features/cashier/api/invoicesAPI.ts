import axios from 'axios';

const API_URL = '/api/invoices/history';

export interface InvoiceHistoryItem {
  order_id: string;
  table_number: number;
  total: number;
  status: string;
  payment_method?: string | null;
  waiter_name?: string;
  created_at: string;
  updated_at: string;
  blockchain_tx_hash?: string | null;
}

export const getInvoiceHistory = async (
  token: string,
  query: string,
  limit = 50,
  offset = 0,
  day?: string,
  month?: string
): Promise<InvoiceHistoryItem[]> => {
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
