import React from 'react';
import type { WaiterStatsFilterMode } from '../../types/waiterStatsTypes';

interface WaiterApprovedStatsFiltersProps {
  filterMode: WaiterStatsFilterMode;
  dayValue: string;
  monthValue: string;
  rangeFrom: string;
  rangeTo: string;
  onFilterModeChange: (value: WaiterStatsFilterMode) => void;
  onDayChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onRangeFromChange: (value: string) => void;
  onRangeToChange: (value: string) => void;
  onApply: () => void;
}

export const WaiterApprovedStatsFilters: React.FC<WaiterApprovedStatsFiltersProps> = ({
  filterMode,
  dayValue,
  monthValue,
  rangeFrom,
  rangeTo,
  onFilterModeChange,
  onDayChange,
  onMonthChange,
  onRangeFromChange,
  onRangeToChange,
  onApply,
}) => (
  <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-slate-800">Comandas aprobadas por mesero</h3>
      <button
        onClick={onApply}
        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
      >
        Aplicar
      </button>
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => onFilterModeChange('day')}
        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${
          filterMode === 'day' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        Dia
      </button>
      <button
        onClick={() => onFilterModeChange('month')}
        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${
          filterMode === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        Mes
      </button>
      <button
        onClick={() => onFilterModeChange('range')}
        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${
          filterMode === 'range' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        Rango
      </button>
    </div>

    {filterMode === 'day' && (
      <div>
        <label className="text-xs text-slate-500">Dia</label>
        <input
          type="date"
          value={dayValue}
          onChange={(event) => onDayChange(event.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
      </div>
    )}

    {filterMode === 'month' && (
      <div>
        <label className="text-xs text-slate-500">Mes</label>
        <input
          type="month"
          value={monthValue}
          onChange={(event) => onMonthChange(event.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
      </div>
    )}

    {filterMode === 'range' && (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={rangeFrom}
            onChange={(event) => onRangeFromChange(event.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={rangeTo}
            onChange={(event) => onRangeToChange(event.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
      </div>
    )}
  </div>
);
