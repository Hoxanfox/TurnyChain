import React from 'react';
import type { Order } from '../../../types/orders';

interface TableCardProps {
  tableNumber: number;
  orders: Order[];
  onViewOrders: (tableNumber: number) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ tableNumber, orders, onViewOrders }) => {
  // Calcular estadísticas de la mesa
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingVerification = orders.filter(o => o.status === 'por_verificar').length;
  const paid = orders.filter(o => o.status === 'pagado').length;
  const delivered = orders.filter(o => o.status === 'entregado').length;

  // Determinar el estado predominante de la mesa
  const getTableStatus = () => {
    if (pendingVerification > 0) return 'warning';
    if (paid === orders.length) return 'success';
    if (delivered > 0) return 'info';
    return 'default';
  };

  const status = getTableStatus();

  const statusStyles = {
    warning: 'from-orange-500 to-red-500 animate-pulse',
    success: 'from-green-500 to-emerald-600',
    info: 'from-blue-500 to-indigo-600',
    default: 'from-gray-400 to-gray-600',
  };

  return (
    <button
      onClick={() => onViewOrders(tableNumber)}
      className="w-full bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden"
    >
      {/* Header con número de mesa */}
      <div className={`bg-gradient-to-r ${statusStyles[status]} text-white p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🪑</span>
            <div className="text-left">
              <h3 className="text-2xl font-bold">Mesa {tableNumber}</h3>
              <p className="text-sm opacity-90">{orders.length} órden{orders.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>
          {pendingVerification > 0 && (
            <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
              <span className="text-xl animate-bounce inline-block">⚠️</span>
              <span className="ml-1 font-bold">{pendingVerification}</span>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="p-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-semibold text-gray-700">Total</span>
          </div>
          <span className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</span>
        </div>

        {/* Estado de órdenes */}
        <div className="grid grid-cols-3 gap-2">
          {pendingVerification > 0 && (
            <div className="bg-orange-50 rounded-lg p-2 text-center">
              <p className="text-2xl">⚠️</p>
              <p className="text-xs font-semibold text-orange-700">{pendingVerification} Por Verificar</p>
            </div>
          )}
          {delivered > 0 && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-2xl">✅</p>
              <p className="text-xs font-semibold text-blue-700">{delivered} Entregado</p>
            </div>
          )}
          {paid > 0 && (
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-2xl">💳</p>
              <p className="text-xs font-semibold text-green-700">{paid} Pagado</p>
            </div>
          )}
        </div>

        {/* Botón de acción */}
        <div className="pt-2">
          <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold">
            <span>Ver Órdenes</span>
            <span className="text-xl">→</span>
          </div>
        </div>
      </div>
    </button>
  );
};

