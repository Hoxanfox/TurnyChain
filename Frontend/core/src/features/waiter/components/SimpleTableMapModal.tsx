// =================================================================
// Modal con Mapa Visual Simplificado de Mesas (Sin Búsqueda)
// Para uso en TablesSlide
// =================================================================
import React from 'react';
import { FaTimes, FaCheck } from 'react-icons/fa';
import type { Table } from '../../../types/tables';

interface SimpleTableMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  selectedTableId: string;
  onSelectTable: (tableId: string) => void;
}

const SimpleTableMapModal: React.FC<SimpleTableMapModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTableId,
  onSelectTable
}) => {
  // Filtrar mesas reales (no virtuales)
  const realTables = tables.filter(t => t.table_number < 9998);

  const handleTableClick = (table: Table) => {
    if (!table.is_active) return;
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
              🗺️ Selecciona una Mesa
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Haz click en la mesa que deseas asignar
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all"
            title="Cerrar"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Info - Mesa seleccionada actual */}
        {selectedTableId && (
          <div className="px-6 py-3 bg-green-50 border-b border-green-200 flex-shrink-0">
            <span className="text-green-600 font-semibold text-sm flex items-center gap-2">
              <FaCheck className="text-green-600" />
              Mesa actual: {tables.find(t => t.id === selectedTableId)?.table_number}
            </span>
          </div>
        )}

        {/* Mapa de Mesas - Grid Responsive */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          {realTables.length > 0 ? (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {realTables.map(table => {
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
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No hay mesas disponibles
              </p>
            </div>
          )}
        </div>

        {/* Footer con Leyenda */}
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

export default SimpleTableMapModal;

