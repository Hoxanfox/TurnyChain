import React from 'react';
import type { FilterMode } from '../types/invoiceHistoryTypes';

interface InvoiceHistoryFiltersProps {
  query: string;
  filterMode: FilterMode;
  dayValue: string;
  monthValue: string;
  limit: number;
  onFilterModeChange: (value: FilterMode) => void;
  onDayChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export const InvoiceHistoryFilters: React.FC<InvoiceHistoryFiltersProps> = ({
  query,
  filterMode,
  dayValue,
  monthValue,
  limit,
  onFilterModeChange,
  onDayChange,
  onMonthChange,
  onQueryChange,
  onSubmit,
  onClear,
}) => (
  <form
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
    className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-3"
  >
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onFilterModeChange('day')}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
          filterMode === 'day' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        📅 Dia
      </button>
      <button
        type="button"
        onClick={() => onFilterModeChange('month')}
        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
          filterMode === 'month' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        🗓️ Mes
      </button>
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      {filterMode === 'day' ? (
        <input
          type="date"
          value={dayValue}
          onChange={(event) => onDayChange(event.target.value)}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      ) : (
        <input
          type="month"
          value={monthValue}
          onChange={(event) => onMonthChange(event.target.value)}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      )}
    </div>
    <label className="block text-sm font-semibold text-gray-700">
      🔍 Buscar por ID o hash
    </label>
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Ej: 0x123... o UUID"
        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
    <p className="text-xs text-gray-500">Carga maxima por pagina: {limit} facturas.</p>
  </form>
);
