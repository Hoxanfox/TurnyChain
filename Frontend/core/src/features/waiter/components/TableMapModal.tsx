// =================================================================
// TableMapModal — Modal interno del CartSlide (absolute, no fixed)
// =================================================================
import React, { useState, useMemo } from 'react';
import type { Table } from '../../../types/tables';

interface TableMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  selectedTableId: string;
  onSelectTable: (tableId: string) => void;
}

const TableMapModal: React.FC<TableMapModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTableId,
  onSelectTable,
}) => {
  const [search, setSearch] = useState('');

  const realTables = useMemo(
    () =>
      tables
        .filter(t => t.table_number < 9998)
        .sort((a, b) => a.table_number - b.table_number),
    [tables]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return realTables;
    return realTables.filter(t =>
      t.table_number.toString().includes(search.trim())
    );
  }, [realTables, search]);

  const handleSelect = (table: Table) => {
    onSelectTable(table.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    /* Overlay absoluto — se queda dentro del CartSlide (que es relative) */
    <div className="absolute inset-0 z-40 flex flex-col bg-gray-50">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 shadow-sm px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Botón volver */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors p-1 -ml-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Seleccionar Mesa</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
              {realTables.length} mesas disponibles
            </p>
          </div>

          {/* Mesa actualmente seleccionada */}
          {selectedTableId && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
              Mesa {tables.find(t => t.id === selectedTableId)?.table_number}
            </span>
          )}
        </div>

        {/* Buscador */}
        <div className="mt-3 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="number"
            placeholder="Buscar número de mesa…"
            value={search}
            onChange={e => setSearch(e.target.value)}
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
      </div>

      {/* ── Grid de mesas ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-medium">Sin resultados para "{search}"</p>
            <button
              onClick={() => setSearch('')}
              className="text-xs text-indigo-500 underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filtered.map(table => {
              const isSelected = selectedTableId === table.id;
              const isActive   = table.is_active;

              return (
                <button
                  key={table.id}
                  onClick={() => isActive && handleSelect(table)}
                  disabled={!isActive}
                  className={`
                    aspect-square rounded-2xl font-bold
                    flex flex-col items-center justify-center gap-1
                    transition-all duration-150 shadow-sm
                    ${isSelected
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 scale-105'
                      : isActive
                      ? 'bg-white text-gray-800 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  <span className="text-base font-extrabold leading-none">
                    {table.table_number}
                  </span>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {!isActive && (
                    <span className="text-xs font-normal leading-none">inactiva</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Leyenda footer ────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block"></span>
              Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>
              Seleccionada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block"></span>
              Inactiva
            </span>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {filtered.length} / {realTables.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TableMapModal;
