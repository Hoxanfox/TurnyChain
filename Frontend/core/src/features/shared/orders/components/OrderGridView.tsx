// =================================================================
// ARCHIVO 1: /src/features/shared/OrderGridView.tsx (NUEVO ARCHIVO REUTILIZABLE)
// =================================================================
import React from 'react';
import type { Order } from '../../../../types/orders.ts';

interface OrderGridViewProps {
  orders: Order[];
  renderActions: (order: Order) => React.ReactNode;
}

const OrderGridView: React.FC<OrderGridViewProps> = ({ orders, renderActions }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.isArray(orders) && orders.map(order => (
        <div key={order.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200 relative">
          {/* Indicador de pago con comprobante */}
          {order.payment_method && (
            <div className="absolute top-2 right-2">
              <span className={`text-2xl ${order.payment_method === 'transferencia' ? '📱' : '💵'}`} title={order.payment_method}>
                {order.payment_method === 'transferencia' ? '📱' : '💵'}
              </span>
              {order.payment_proof_path && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" title="Comprobante adjunto"></span>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-lg">Mesa: {order.table_number}</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              order.status === 'por_verificar' 
                ? 'bg-yellow-100 text-yellow-800 animate-pulse' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {order.status}
            </span>
          </div>

          {/* ID de orden corto */}
          <p className="text-gray-700 text-xs font-mono bg-gray-100 px-2 py-1 rounded mb-2">
            🆔 #{order.id.slice(0, 8).toUpperCase()}
          </p>

          {/* Información del mesero */}
          <p className="text-gray-600 text-sm font-medium">
            👤 Mesero: {order.waiter_name || order.waiter_id.substring(0, 8)}
          </p>

          {/* Tiempo de llegada */}
          <p className="text-gray-500 text-xs mt-1">
            🕐 {new Date(order.created_at).toLocaleString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            })}
          </p>

          <p className="text-gray-800 text-2xl font-bold mt-2">${order.total.toFixed(2)}</p>

          {/* Info de pago compacta */}
          {order.payment_method && (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
              {order.payment_method === 'transferencia' ? '📱 Transferencia' : '💵 Efectivo'}
              {order.payment_proof_path && ' • Con comprobante'}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {renderActions(order)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderGridView;