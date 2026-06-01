export interface WaiterMetric {
  name: string;
  total: number;
  count: number;
  average: number;
  share: number;
}

export interface CashierMetricsSummary {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  topWaiterName: string;
  topWaiterTotal: number;
  topWaiterOrders: number;
}
