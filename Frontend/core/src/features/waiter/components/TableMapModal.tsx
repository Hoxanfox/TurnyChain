// =================================================================
// Modal con Mapa Visual de Mesas (Estilo Cine)
// =================================================================
import React, { useState, useCallback } from 'react';
import { FaTimes, FaSearch, FaCheck } from 'react-icons/fa';
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
  onSelectTable
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<string>('all');

  // Filtrar mesas reales (no virtuales)
  const realTables = tables.filter(t => t.table_number < 9998);

  // Agrupar mesas en rangos
  const getTableRanges = useCallback(() => {
    if (realTables.length === 0) return [];

    const sortedTables = [...realTables].sort((a, b) => a.table_number - b.table_number);
    const ranges: { label: string; value: string; start: number; end: number }[] = [
      { label: 'Todas las mesas', value: 'all', start: 0, end: Infinity }
    ];

    const minTable = sortedTables[0].table_number;
    const maxTable = sortedTables[sortedTables.length - 1].table_number;

    for (let start = Math.floor(minTable / 10) * 10; start <= maxTable; start += 10) {
      const end = start + 9;
      const count = sortedTables.filter(t => t.table_number >= start && t.table_number <= end).length;

      if (count > 0) {
        ranges.push({
          label: `${start}-${end} (${count})`,
          value: `${start}-${end}`,
          start,
          end
        });
      }
    }

    return ranges;
  }, [realTables]);

  const tableRanges = getTableRanges();

  // Filtrar mesas según búsqueda y rango
  const filteredTables = realTables.filter(table => {
    // Filtro por búsqueda
    if (searchQuery && !table.table_number.toString().includes(searchQuery)) {
      return false;
    }

    // Filtro por rango
    if (selectedRange !== 'all') {
      const [start, end] = selectedRange.split('-').map(Number);
      if (table.table_number < start || table.table_number > end) {
        return false;
      }
    }

    return true;
  });

  const handleTableClick = (table: Table) => {
    onSelectTable(table.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              🗺️ Mapa de Mesas
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Selecciona una mesa haciendo click
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Controles */}
        <div className="p-4 border-b border-gray-200 space-y-3 flex-shrink-0">
          {/* Búsqueda */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar mesa por número..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filtro por rango */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {tableRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedRange === range.value
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Mostrando {filteredTables.length} de {realTables.length} mesas
            </span>
            {selectedTableId && (
              <span className="text-green-600 font-semibold flex items-center gap-2">
                <FaCheck />
                Mesa {tables.find(t => t.id === selectedTableId)?.table_number} seleccionada
              </span>
            )}
          </div>
        </div>

        {/* Mapa de Mesas - Estilo Cine */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {filteredTables.map(table => {
              const isSelected = selectedTableId === table.id;
              const isActive = table.is_active;

              return (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  disabled={!isActive}
                  className={`
                    aspect-square rounded-xl font-bold text-lg
                    transition-all duration-200 transform hover:scale-110
                    flex flex-col items-center justify-center
                    shadow-md hover:shadow-xl
                    ${isSelected
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-4 ring-green-300 scale-110'
                      : isActive
                      ? 'bg-gradient-to-br from-indigo-400 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                    }
                  `}
                  title={`Mesa ${table.table_number}${!isActive ? ' (Inactiva)' : ''}`}
                >
                  <span className="text-xl">{table.table_number}</span>
                  {isSelected && (
                    <FaCheck className="text-xs mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {filteredTables.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No se encontraron mesas
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRange('all');
                }}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded"></div>
              <span className="text-gray-600">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 rounded"></div>
              <span className="text-gray-600">Seleccionada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-gray-600">Inactiva</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableMapModal;

