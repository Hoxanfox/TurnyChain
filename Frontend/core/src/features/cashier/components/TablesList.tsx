import React from 'react';
import type { Order } from '../../../types/orders';

interface TablesListProps {
  ordersByTable: Record<number, Order[]>;
  selectedTable: number | null;
  onSelectTable: (tableNumber: number) => void;
}

export const TablesList: React.FC<TablesListProps> = ({
  ordersByTable,
  selectedTable,
  onSelectTable,
}) => {
  const tableNumbers = Object.keys(ordersByTable).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="w-full md:w-1/4 bg-white p-4 rounded-lg shadow overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🪑 Mesas Activas</h2>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
          {tableNumbers.length}
        </span>
      </div>

      {tableNumbers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">📭</p>
          <p>No hay mesas con órdenes activas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tableNumbers.map(tableNumStr => {
            const tableNum = Number(tableNumStr);
            const orders = ordersByTable[tableNum];
            const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
            const hasPendingVerification = orders.some(o => o.status === 'por_verificar');

            return (
              <button
                key={tableNum}
                onClick={() => onSelectTable(tableNum)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedTable === tableNum 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' 
                    : 'bg-gray-100 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start font-semibold mb-1">
                  <span className="text-lg">Mesa {tableNum}</span>
                  {hasPendingVerification && (
                    <span className="animate-pulse text-xl">⚠️</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className={`${selectedTable === tableNum ? 'text-white opacity-90' : 'text-gray-600'}`}>
                    {orders.length} órden{orders.length !== 1 ? 'es' : ''}
                  </span>
                  <span className={`font-bold ${selectedTable === tableNum ? 'text-white' : 'text-green-600'}`}>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

