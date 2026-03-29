import React, { useMemo, useState } from 'react';

interface QuickTablePickerModalProps {
  isOpen: boolean;
  tableNumbers: number[];
  selectedTable: number | null;
  onSelectTable: (tableNumber: number) => void;
  onClose: () => void;
}

export const QuickTablePickerModal: React.FC<QuickTablePickerModalProps> = ({
  isOpen,
  tableNumbers,
  selectedTable,
  onSelectTable,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  const ranges = useMemo(() => {
    const groups = new Map<number, number[]>();
    tableNumbers.forEach((tableNumber) => {
      const bucket = Math.floor((tableNumber - 1) / 10);
      const current = groups.get(bucket) || [];
      current.push(tableNumber);
      groups.set(bucket, current);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, numbers]) => {
        const sortedNumbers = numbers.sort((a, b) => a - b);
        const start = bucket * 10 + 1;
        const end = start + 9;
        return {
          key: `${start}-${end}`,
          label: `${start}-${end}`,
          tables: sortedNumbers,
        };
      });
  }, [tableNumbers]);

  const selectedRangeKey = useMemo(() => {
    if (!selectedTable) return ranges[0]?.key || null;
    const foundRange = ranges.find((range) => range.tables.includes(selectedTable));
    return foundRange?.key || ranges[0]?.key || null;
  }, [ranges, selectedTable]);

  const [manualRangeKey, setManualRangeKey] = useState<string | null>(null);

  const activeRangeKey = manualRangeKey || selectedRangeKey;

  const filteredTables = useMemo(() => {
    const query = search.trim();
    if (query) {
      return tableNumbers.filter((tableNumber) => tableNumber.toString().includes(query));
    }

    const activeRange = ranges.find((range) => range.key === activeRangeKey);
    return activeRange?.tables || tableNumbers;
  }, [search, tableNumbers, ranges, activeRangeKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl shadow-2xl border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Seleccionar Mesa Rapido</h2>
              <p className="text-xs text-indigo-100">Vista estilo cine para acceso inmediato</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              aria-label="Cerrar selector de mesas"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar numero de mesa..."
              className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-1"
                aria-label="Limpiar busqueda"
              >
                ✕
              </button>
            )}
          </div>

          {!search.trim() && ranges.length > 1 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bloques de mesas</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {ranges.map((range) => {
                  const isActive = activeRangeKey === range.key;
                  return (
                    <button
                      key={range.key}
                      onClick={() => setManualRangeKey(range.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      Mesas {range.label} ({range.tables.length})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredTables.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No hay mesas para esa busqueda.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[52vh] overflow-y-auto pr-1">
              {filteredTables.map((tableNumber) => {
                const isSelected = selectedTable === tableNumber;
                return (
                  <button
                    key={tableNumber}
                    onClick={() => {
                      onSelectTable(tableNumber);
                      onClose();
                    }}
                    className={`rounded-2xl p-3 text-sm font-bold transition-all border text-left ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]'
                        : 'bg-white text-gray-800 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide opacity-80">Mesa</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-extrabold">{tableNumber}</span>
                      {isSelected ? <span className="text-xs">✓</span> : <span className="text-xs opacity-70">🪑</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>{filteredTables.length} mesa(s) visible(s)</span>
            {selectedTable !== null && <span className="font-semibold text-indigo-700">Seleccionada: Mesa {selectedTable}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
