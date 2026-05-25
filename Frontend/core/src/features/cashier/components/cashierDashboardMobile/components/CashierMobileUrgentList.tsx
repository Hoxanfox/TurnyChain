import React from 'react';
import type { Order } from '../../../../../types/orders';

interface CashierMobileUrgentListProps {
  orders: Order[];
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewDetail: (orderId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const CashierMobileUrgentList: React.FC<CashierMobileUrgentListProps> = ({
  orders,
  onConfirmPayment,
  onRejectPayment,
  onViewDetail,
  hasMore,
  onLoadMore,
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <p className="text-6xl mb-4">✅</p>
        <p className="text-gray-500 text-xl font-semibold">No hay pagos por verificar</p>
        <p className="text-gray-400 mt-2">¡Excelente trabajo!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-2xl shadow-lg p-4 border-2 border-orange-300">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪑</span>
                <h3 className="text-xl font-bold">Mesa {order.table_number}</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">Orden #{order.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-600">Mesero: {order.waiter_name || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">${order.total.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{order.payment_method}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onConfirmPayment(order.id)}
              className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-md transition-all"
            >
              ✓ Confirmar Pago
            </button>
            <button
              onClick={() => onRejectPayment(order.id)}
              className="px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-md transition-all"
            >
              ✕ Rechazar
            </button>
          </div>
          <button
            onClick={() => onViewDetail(order.id)}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span className="text-lg">📋</span>
            <span>Ver Detalle</span>
          </button>
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full px-4 py-3 bg-white text-orange-700 rounded-xl font-semibold shadow hover:bg-orange-50 transition-colors"
        >
          Cargar mas urgentes
        </button>
      )}
    </div>
  );
};
