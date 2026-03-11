// =================================================================
// ARCHIVO 1: /src/features/shared/OrderGridView.tsx (NUEVO ARCHIVO REUTILIZABLE)
// =================================================================
import React from 'react';
import type { Order } from '../../../../types/orders.ts';
import { formatMoney } from '../../../../utils/formatUtils.ts';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente_aprobacion: { label: '⏳ Pendiente', className: 'bg-gray-100 text-gray-700' },
  recibido:             { label: '📥 Recibido', className: 'bg-sky-100 text-sky-700' },
  en_preparacion:       { label: '👨‍🍳 En Preparación', className: 'bg-orange-100 text-orange-700' },
  listo_para_servir:    { label: '🍽️ Listo para servir', className: 'bg-indigo-100 text-indigo-700' },
  entregado:            { label: '✅ Entregado', className: 'bg-teal-100 text-teal-700' },
  por_verificar:        { label: '🔍 Por Verificar', className: 'bg-yellow-100 text-yellow-800 animate-pulse' },
  pagado:               { label: '💰 Pagado', className: 'bg-green-100 text-green-700' },
  cancelado:            { label: '❌ Cancelado', className: 'bg-red-100 text-red-700' },
};

interface OrderGridViewProps {
  orders: Order[];
  renderActions: (order: Order) => React.ReactNode;
}

const OrderGridView: React.FC<OrderGridViewProps> = ({ orders, renderActions }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" style={{ colorScheme: 'light' }}>
      {Array.isArray(orders) && orders.map(order => (
        <div key={order.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200 relative text-gray-900">
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
            <p className="font-bold text-lg text-gray-900">Mesa: {order.table_number}</p>
            {(() => {
              const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, className: 'bg-blue-100 text-blue-800' };
              return (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.className}`}>
                  {cfg.label}
                </span>
              );
            })()}
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

          <p className="text-gray-800 text-2xl font-bold mt-2">{formatMoney(order.total)}</p>

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