import React, { useMemo, useState } from 'react';
import type { Order } from '../../../../types/orders';

interface CinemaTablesSelectorProps {
  ordersByTable: Record<number, Order[]>;
  selectedTable: number | null;
  onSelectTable: (tableNumber: number) => void;
}

export const CinemaTablesSelector: React.FC<CinemaTablesSelectorProps> = ({
  ordersByTable,
  selectedTable,
  onSelectTable,
}) => {
  const [search, setSearch] = useState('');

  const tableNumbers = useMemo(
    () => Object.keys(ordersByTable).map(Number).sort((a, b) => a - b),
    [ordersByTable]
  );

  const filteredTableNumbers = useMemo(() => {
    const query = search.trim();
    if (!query) return tableNumbers;
    return tableNumbers.filter((tableNumber) => tableNumber.toString().includes(query));
  }, [tableNumbers, search]);

  return (
    <div className="w-full md:w-1/4 bg-white p-4 rounded-lg shadow overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🎬 Selector de Mesas</h2>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
          {tableNumbers.length}
        </span>
      </div>

      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar mesa..."
          className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {filteredTableNumbers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">🔍</p>
          <p>No hay mesas para la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredTableNumbers.map((tableNumber) => {
            const orders = ordersByTable[tableNumber] || [];
            const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
            const hasPendingVerification = orders.some((order) => order.status === 'por_verificar');
            const isSelected = selectedTable === tableNumber;

            return (
              <button
                key={tableNumber}
                onClick={() => onSelectTable(tableNumber)}
                className={`
                  rounded-2xl p-3 text-left transition-all border
                  ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-base">Mesa {tableNumber}</span>
                  {hasPendingVerification && <span className="text-base">⚠️</span>}
                </div>
                <p className={`text-xs ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                  {orders.length} órden{orders.length !== 1 ? 'es' : ''}
                </p>
                <p className={`text-sm font-bold mt-1 ${isSelected ? 'text-white' : 'text-green-600'}`}>
                  ${totalAmount.toFixed(2)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
