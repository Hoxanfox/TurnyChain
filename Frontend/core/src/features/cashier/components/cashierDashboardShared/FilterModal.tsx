import React from 'react';
import type { FilterStatus, PaymentMethodFilter, SortBy } from './CashierFilters';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  sortBy: SortBy;
  onFilterStatusChange: (status: FilterStatus) => void;
  onPaymentMethodFilterChange: (method: PaymentMethodFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onClearFilters: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filterStatus,
  paymentMethodFilter,
  searchQuery,
  sortBy,
  onFilterStatusChange,
  onPaymentMethodFilterChange,
  onSearchQueryChange,
  onSortByChange,
  onClearFilters,
}) => {
  if (!isOpen) return null;

  const hasActiveFilters = filterStatus !== 'all' || paymentMethodFilter !== 'all' || searchQuery !== '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <h2 className="text-xl font-bold">Filtros y Búsqueda</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar
            </label>
            <input
              type="text"
              placeholder="Mesa, ID o mesero..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Estado de Pago */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📋 Estado de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onFilterStatusChange('all')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Todas
              </button>
              <button
                onClick={() => onFilterStatusChange('por_verificar')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filterStatus === 'por_verificar'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚠️ Por Verificar
              </button>
              <button
                onClick={() => onFilterStatusChange('entregado')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filterStatus === 'entregado'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🧾 Por Cobrar
              </button>
              <button
                onClick={() => onFilterStatusChange('pagado')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  filterStatus === 'pagado'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Pagado
              </button>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              💳 Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onPaymentMethodFilterChange('all')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  paymentMethodFilter === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => onPaymentMethodFilterChange('efectivo')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  paymentMethodFilter === 'efectivo'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => onPaymentMethodFilterChange('transferencia')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  paymentMethodFilter === 'transferencia'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏦 Transfer.
              </button>
              <button
                onClick={() => onPaymentMethodFilterChange('mixto')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  paymentMethodFilter === 'mixto'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔀 Mixto
              </button>
            </div>
          </div>

          {/* Ordenar por */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📊 Ordenar por
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onSortByChange('time')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  sortBy === 'time'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⏰ Reciente
              </button>
              <button
                onClick={() => onSortByChange('total')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  sortBy === 'total'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💵 Monto
              </button>
              <button
                onClick={() => onSortByChange('table')}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  sortBy === 'table'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🪑 Mesa
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-4 border-t grid grid-cols-2 gap-3">
          {hasActiveFilters && (
            <button
              onClick={() => {
                onClearFilters();
                onClose();
              }}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-md"
            >
              ✕ Limpiar
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md ${
              !hasActiveFilters ? 'col-span-2' : ''
            }`}
          >
            ✓ Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
};


