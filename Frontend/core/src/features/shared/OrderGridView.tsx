// =================================================================
// ARCHIVO 1: /src/features/shared/OrderGridView.tsx (NUEVO ARCHIVO REUTILIZABLE)
// =================================================================
import React from 'react';
import type { Order } from '../../types/orders';

interface OrderGridViewProps {
  orders: Order[];
  renderActions: (order: Order) => React.ReactNode;
}

const OrderGridView: React.FC<OrderGridViewProps> = ({ orders, renderActions }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.isArray(orders) && orders.map(order => (
        <div key={order.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-lg">Mesa: {order.table_number}</p>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{order.status}</span>
          </div>
          <p className="text-gray-600 text-xs">Mesero: {order.waiter_id.substring(0, 8)}</p>
          <p className="text-gray-800 text-2xl font-bold mt-1">${order.total.toFixed(2)}</p>
          <div className="mt-4 space-y-2">
            {renderActions(order)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderGridView;