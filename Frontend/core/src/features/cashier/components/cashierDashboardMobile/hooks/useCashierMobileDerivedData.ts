import { useMemo } from 'react';
import type { Order } from '../../../../../types/orders';
import type { CashierStatistics } from '../../../types/cashierDashboardTypes';

interface CashierMobileDerivedDataParams {
  ordersByTable: Record<number, Order[]>;
  statistics: CashierStatistics;
  pendingVerificationCount: number;
  isPorCobrarStatus: (status: string) => boolean;
}

export const useCashierMobileDerivedData = ({
  ordersByTable,
  statistics,
  pendingVerificationCount,
  isPorCobrarStatus,
}: CashierMobileDerivedDataParams) => {
  const allOrders = useMemo(() => Object.values(ordersByTable).flat(), [ordersByTable]);

  const waiterOptions = useMemo(() => {
    const waiterMap = new Map<string, { ordersCount: number; tables: Set<number> }>();

    allOrders.forEach((order) => {
      const waiterName = (order.waiter_name || '').trim();
      if (!waiterName) return;

      const current = waiterMap.get(waiterName) || { ordersCount: 0, tables: new Set<number>() };
      current.ordersCount += 1;
      current.tables.add(order.table_number);
      waiterMap.set(waiterName, current);
    });

    return Array.from(waiterMap.entries())
      .map(([name, value]) => ({
        name,
        ordersCount: value.ordersCount,
        tablesCount: value.tables.size,
      }))
      .sort((a, b) => b.ordersCount - a.ordersCount || a.name.localeCompare(b.name));
  }, [allOrders]);

  const urgentOrders = useMemo(
    () => allOrders.filter((order) => order.status === 'por_verificar'),
    [allOrders]
  );
  const deliveredOrders = useMemo(
    () => allOrders.filter((order) => isPorCobrarStatus(order.status)),
    [allOrders, isPorCobrarStatus]
  );
  const paidOrders = useMemo(
    () => allOrders.filter((order) => order.status === 'pagado'),
    [allOrders]
  );

  const statsForCard = useMemo(() => ({
    totalOrders: statistics.ordersCount,
    totalRevenue: statistics.totalPaid,
    pendingPayments: pendingVerificationCount,
    verifiedPayments: paidOrders.length,
    cashPayments: allOrders.filter((order) => order.status === 'pagado' && (order.payments?.some(p => p.method === 'efectivo') || order.payment_method === 'efectivo')).length,
    transferPayments: allOrders.filter((order) => order.status === 'pagado' && (order.payments?.some(p => p.method === 'transferencia') || order.payment_method === 'transferencia')).length,
    averageOrderValue: statistics.averageOrderValue,
    dailyRevenue: statistics.dailyRevenue,
    dailyCash: statistics.dailyCash,
    dailyTransfer: statistics.dailyTransfer,
    dailyOrdersCount: statistics.dailyOrdersCount,
    dailyAverageTicket: statistics.dailyAverageTicket,
  }), [allOrders, paidOrders.length, pendingVerificationCount, statistics]);

  const sortedTableNumbers = useMemo(() => Object.keys(ordersByTable)
    .map(Number)
    .sort((a, b) => {
      const aHasUrgent = ordersByTable[a].some((order) => order.status === 'por_verificar');
      const bHasUrgent = ordersByTable[b].some((order) => order.status === 'por_verificar');
      if (aHasUrgent && !bHasUrgent) return -1;
      if (!aHasUrgent && bHasUrgent) return 1;
      return a - b;
    }), [ordersByTable]);

  return {
    allOrders,
    waiterOptions,
    urgentOrders,
    deliveredOrders,
    paidOrders,
    statsForCard,
    sortedTableNumbers,
  };
};
