export interface CashierExpense {
  id: string;
  session_id: string;
  amount: number;
  description: string;
  image_path?: string;
  created_at: string;
}

export interface CashierSession {
  id: string;
  cashier_id: string;
  cashier_name?: string;
  initial_fund: number;
  opened_at: string;
  closed_at?: string;
  expected_cash?: number;
  actual_cash?: number;
  discrepancy?: number;
  notes?: string;
  status: 'open' | 'closed';
  expenses?: CashierExpense[];
  
  // Totales dinámicos
  cash_sales: number;
  transfer_sales: number;
  total_sales: number;
  orders_count: number;
}
