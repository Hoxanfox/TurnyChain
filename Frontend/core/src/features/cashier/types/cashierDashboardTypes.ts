export interface CashierStatistics {
  totalPaid: number;
  totalPending: number;
  totalVerification: number;
  totalDelivered: number;
  cashTotal: number;
  transferTotal: number;
  ordersCount: number;
  averageOrderValue: number;
  dailyRevenue: number;
  dailyCash: number;
  dailyTransfer: number;
  dailyOrdersCount: number;
  dailyAverageTicket: number;
}

export interface CashierNotification {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
