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

export interface ProductSalesStat {
  product_id: string;
  product_name: string;
  category_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface ProductMetricsSummary {
  totalProductsSold: number;
  topProductName: string;
  topProductQuantity: number;
  topCategoryName: string;
}
