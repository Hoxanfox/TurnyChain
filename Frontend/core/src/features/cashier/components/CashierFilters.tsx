import React from 'react';

export type FilterStatus = 'all' | 'por_verificar' | 'entregado' | 'pagado';
export type PaymentMethodFilter = 'all' | 'efectivo' | 'transferencia';
export type SortBy = 'time' | 'total' | 'table';

interface CashierFiltersProps {
  // Estado de filtros
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  sortBy: SortBy;

  // Handlers
  onFilterStatusChange: (status: FilterStatus) => void;
  onPaymentMethodFilterChange: (method: PaymentMethodFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onClearFilters: () => void;

  // Datos para mostrar
  totalOrders: number;
  pendingVerificationCount: number;
  cashPayments: number;
  transferPayments: number;
}

export const CashierFilters: React.FC<CashierFiltersProps> = ({
  filterStatus,
  paymentMethodFilter,
  searchQuery,
  sortBy,
  onFilterStatusChange,
  onPaymentMethodFilterChange,
  onSearchQueryChange,
  onSortByChange,
  onClearFilters,
  totalOrders,
  pendingVerificationCount,
  cashPayments,
  transferPayments,
}) => {
  const hasActiveFilters = filterStatus !== 'all' || paymentMethodFilter !== 'all' || searchQuery !== '';

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4 border-2 border-gray-100">
      {/* Header con resumen de filtros */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <h2 className="text-xl font-bold text-gray-800">Filtros y Búsqueda</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
          >
            <span>✕</span>
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Fila 1: Búsqueda y Ordenamiento */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🔍 Buscar
          </label>
          <input
            type="text"
            placeholder="Buscar por mesa, ID o mesero..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📊 Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="time">⏰ Más reciente</option>
              <option value="total">💵 Mayor monto</option>
              <option value="table">🪑 Por mesa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fila 2: Filtros por estado */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📋 Estado de Pago
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onFilterStatusChange('all')}
            className={`px-4 py-2.5 rounded-lg transition-all font-semibold ${
              filterStatus === 'all' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
            }`}
          >
            Todas <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-sm">({totalOrders})</span>
          </button>
          <button
            onClick={() => onFilterStatusChange('por_verificar')}
            className={`px-4 py-2.5 rounded-lg transition-all relative font-semibold ${
              filterStatus === 'por_verificar' 
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
            }`}
          >
            ⚠️ Por Verificar
            {pendingVerificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold animate-pulse">
                {pendingVerificationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onFilterStatusChange('entregado')}
            className={`px-4 py-2.5 rounded-lg transition-all font-semibold ${
              filterStatus === 'entregado' 
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
            }`}
          >
            🍽️ Entregado
          </button>
          <button
            onClick={() => onFilterStatusChange('pagado')}
            className={`px-4 py-2.5 rounded-lg transition-all font-semibold ${
              filterStatus === 'pagado' 
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
            }`}
          >
            ✅ Pagado
          </button>
        </div>
      </div>

      {/* Fila 3: Filtros por método de pago */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          💳 Método de Pago
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onPaymentMethodFilterChange('all')}
            className={`px-4 py-2.5 rounded-lg transition-all font-semibold ${
              paymentMethodFilter === 'all' 
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
            }`}
          >
            Todos los métodos
          </button>
          <button
            onClick={() => onPaymentMethodFilterChange('efectivo')}
            className={`px-4 py-2.5 rounded-lg transition-all font-semibold ${
              paymentMethodFilter === 'efectivo' 
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
            }`}
          >
            💵 Efectivo <span className={`ml-1 px-2 py-0.5 rounded-full text-sm ${paymentMethodFilter === 'efectivo' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-800'}`}>({cashPayments})</span>
          </button>
          <button
            onClick={() => onPaymentMethodFilterChange('transferencia')}
            className={`px-4 py-2.5 rounded-lg transition-all font-semibold ${
              paymentMethodFilter === 'transferencia' 
                ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg scale-105' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
            }`}
          >
            📱 Transferencia <span className={`ml-1 px-2 py-0.5 rounded-full text-sm ${paymentMethodFilter === 'transferencia' ? 'bg-white/20' : 'bg-pink-100 text-pink-800'}`}>({transferPayments})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

