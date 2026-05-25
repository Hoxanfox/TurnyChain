export type FilterMode = 'day' | 'month';

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

export interface InvoiceHistorySummary {
  count: number;
  total: number;
}
