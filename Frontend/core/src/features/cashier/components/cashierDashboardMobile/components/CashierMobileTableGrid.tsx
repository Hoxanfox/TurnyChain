import React from 'react';
import type { Order } from '../../../../../types/orders';
import { TableCard } from '../../cashierDashboardShared/TableCard';

interface CashierMobileTableGridProps {
  tableNumbers: number[];
  ordersByTable: Record<number, Order[]>;
  onViewOrders: (tableNumber: number) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const CashierMobileTableGrid: React.FC<CashierMobileTableGridProps> = ({
  tableNumbers,
  ordersByTable,
  onViewOrders,
  hasMore,
  onLoadMore,
}) => {
  if (tableNumbers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <p className="text-6xl mb-4">📭</p>
        <p className="text-gray-500 text-xl font-semibold">No hay mesas con ordenes activas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tableNumbers.map((tableNum) => (
          <TableCard
            key={tableNum}
            tableNumber={tableNum}
            orders={ordersByTable[tableNum]}
            onViewOrders={onViewOrders}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full px-4 py-3 bg-white text-purple-700 rounded-xl font-semibold shadow hover:bg-purple-50 transition-colors"
        >
          Cargar mas mesas
        </button>
      )}
    </div>
  );
};
