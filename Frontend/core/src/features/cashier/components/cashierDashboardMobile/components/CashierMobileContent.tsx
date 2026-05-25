import React from 'react';
import type { Order } from '../../../../../types/orders';
import { CashierMobileTableGrid } from './CashierMobileTableGrid';
import { CashierMobileUrgentList } from './CashierMobileUrgentList';

interface CashierMobileContentProps {
  viewMode: 'tables' | 'urgent';
  tableNumbers: number[];
  ordersByTable: Record<number, Order[]>;
  urgentOrders: Order[];
  onViewOrders: (tableNumber: number) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewDetail: (orderId: string) => void;
  hasMoreTables: boolean;
  hasMoreUrgent: boolean;
  onLoadMoreTables: () => void;
  onLoadMoreUrgent: () => void;
}

export const CashierMobileContent: React.FC<CashierMobileContentProps> = ({
  viewMode,
  tableNumbers,
  ordersByTable,
  urgentOrders,
  onViewOrders,
  onConfirmPayment,
  onRejectPayment,
  onViewDetail,
  hasMoreTables,
  hasMoreUrgent,
  onLoadMoreTables,
  onLoadMoreUrgent,
}) => (
  <div className="p-4">
    {viewMode === 'tables' ? (
      <CashierMobileTableGrid
        tableNumbers={tableNumbers}
        ordersByTable={ordersByTable}
        onViewOrders={onViewOrders}
        hasMore={hasMoreTables}
        onLoadMore={onLoadMoreTables}
      />
    ) : (
      <CashierMobileUrgentList
        orders={urgentOrders}
        onConfirmPayment={onConfirmPayment}
        onRejectPayment={onRejectPayment}
        onViewDetail={onViewDetail}
        hasMore={hasMoreUrgent}
        onLoadMore={onLoadMoreUrgent}
      />
    )}
  </div>
);
