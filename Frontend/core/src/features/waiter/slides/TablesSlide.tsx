import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTables } from '../../admin/components/tables/api/tablesSlice.ts';
import SimpleTableMapModal from '../components/SimpleTableMapModal';
import type { AppDispatch, RootState } from '../../../app/store';
import type { Table } from '../../../types/tables';

interface TablesSlideProps {
  selectedTableId: string;
  orderType: string; // "mesa" | "llevar" | "domicilio"
  onSelectTable: (tableId: string) => void;
  onOrderTypeChange: (orderType: string) => void;
  onRequestChangeSlide?: () => void;
}

const TablesSlide: React.FC<TablesSlideProps> = ({
  selectedTableId,
  orderType,
  onSelectTable,
  onOrderTypeChange,
  onRequestChangeSlide
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { tables, status } = useSelector((state: RootState) => state.tables);

  // 🆕 Estado para selector de mesas en dos pasos
  const [selectedRange, setSelectedRange] = useState<string>('');
  // 🆕 Estado para el modal de mapa visual
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTables());
    }
  }, [status, dispatch]);

  // Agrupar mesas en rangos de 10
  const getTableRanges = useCallback(() => {
    const realTables = tables.filter(t => t.table_number < 9998);
    if (realTables.length === 0) return [];

    const sortedTables = [...realTables].sort((a, b) => a.table_number - b.table_number);
    const ranges: { label: string; start: number; end: number; tables: Table[] }[] = [];

    const minTable = sortedTables[0].table_number;
    const maxTable = sortedTables[sortedTables.length - 1].table_number;

    for (let start = Math.floor(minTable / 10) * 10; start <= maxTable; start += 10) {
      const end = start + 9;
      const tablesInRange = sortedTables.filter(
        t => t.table_number >= start && t.table_number <= end
      );

      if (tablesInRange.length > 0) {
        ranges.push({
          label: `${start}-${end}`,
          start,
          end,
          tables: tablesInRange
        });
      }
    }

    return ranges;
  }, [tables]);

  // Obtener mesas del rango seleccionado
  const getTablesInSelectedRange = useCallback(() => {
    if (!selectedRange) return [];
    const ranges = getTableRanges();
    const range = ranges.find(r => r.label === selectedRange);
    return range ? range.tables : [];
  }, [selectedRange, getTableRanges]);

  // Si hay una mesa seleccionada, pre-seleccionar su rango
  useEffect(() => {
    if (selectedTableId && !selectedRange && orderType === 'mesa') {
      const selectedTable = tables.find(t => t.id === selectedTableId);
      if (selectedTable) {
        const ranges = getTableRanges();
        const range = ranges.find(r =>
          selectedTable.table_number >= r.start && selectedTable.table_number <= r.end
        );
        if (range) {
          setSelectedRange(range.label);
        }
      }
    }
  }, [selectedTableId, tables, selectedRange, orderType, getTableRanges]);

  const handleTableClick = (tableId: string) => {
    onSelectTable(tableId);
    onRequestChangeSlide?.();
  };

  const handleOrderTypeChange = (type: string) => {
    onOrderTypeChange(type);
    setSelectedRange(''); // Resetear rango al cambiar tipo de orden

    // Auto-seleccionar mesa virtual según el tipo
    if (type === 'llevar') {
      const virtualTable = tables.find(t => t.table_number === 9999);
      if (virtualTable) {
        onSelectTable(virtualTable.id);
      }
    } else if (type === 'domicilio') {
      const virtualTable = tables.find(t => t.table_number === 9998);
      if (virtualTable) {
        onSelectTable(virtualTable.id);
      }
    }
  };

  // Filtrar mesas reales (no virtuales)
  const realTables = tables.filter(t => t.table_number < 9998);
  const tableRanges = getTableRanges();
  const tablesInRange = getTablesInSelectedRange();

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Header del Slide - Compacto */}
      <div className="flex-shrink-0 p-3 pb-2 bg-white border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Tipo de Orden</h2>

        {/* Selector de Tipo de Orden */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleOrderTypeChange('mesa')}
            className={`p-3 rounded-lg shadow-md transition-all ${
              orderType === 'mesa'
                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <div className="text-center">
              <span className="text-3xl mb-1 block">🍽️</span>
              <p className="text-xs font-bold">MESA</p>
            </div>
          </button>

          <button
            onClick={() => handleOrderTypeChange('llevar')}
            className={`p-3 rounded-lg shadow-md transition-all ${
              orderType === 'llevar'
                ? 'bg-green-600 text-white shadow-lg scale-105'
                : 'bg-white border-2 border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            <div className="text-center">
              <span className="text-3xl mb-1 block">🥡</span>
              <p className="text-xs font-bold">LLEVAR</p>
            </div>
          </button>

          <button
            onClick={() => handleOrderTypeChange('domicilio')}
            className={`p-3 rounded-lg shadow-md transition-all ${
              orderType === 'domicilio'
                ? 'bg-purple-600 text-white shadow-lg scale-105'
                : 'bg-white border-2 border-purple-200 text-purple-700 hover:bg-purple-50'
            }`}
          >
            <div className="text-center">
              <span className="text-3xl mb-1 block">🏍️</span>
              <p className="text-xs font-bold">DOMICILIO</p>
            </div>
          </button>
        </div>
      </div>

      {/* Contenedor con scroll - OPTIMIZADO PARA MUCHAS MESAS */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
        {/* Mostrar selector de mesas solo si es tipo "mesa" */}
        {orderType === 'mesa' && (
          <>
            {/* 🆕 Selector de Mesas en Dos Pasos */}
            <div className="mb-3 space-y-2">
              {/* Paso 1: Seleccionar rango */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  1️⃣ Selecciona un rango
                </label>
                {status === 'loading' ? (
                  <p className="text-gray-600 text-sm">Cargando mesas...</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {tableRanges.map(range => (
                      <button
                        key={range.label}
                        onClick={() => {
                          setSelectedRange(range.label);
                          onSelectTable(''); // Resetear mesa al cambiar rango
                        }}
                        className={`p-3 rounded-lg shadow-md transition-all ${
                          selectedRange === range.label
                            ? 'bg-indigo-600 text-white shadow-lg scale-105'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-center">
                          <p className="text-sm font-bold">Mesas {range.label}</p>
                          <p className="text-xs opacity-75">
                            {range.tables.length} mesas
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Paso 2: Seleccionar mesa específica */}
              {selectedRange && tablesInRange.length > 0 && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    2️⃣ Selecciona la mesa
                  </label>
                  <div className="grid grid-cols-4 gap-2 pb-2">
                    {tablesInRange.map(table => (
                      <button
                        key={table.id}
                        onClick={() => handleTableClick(table.id)}
                        className={`p-4 rounded-lg shadow-md transition-all ${
                          selectedTableId === table.id
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : table.is_active
                            ? 'bg-white border-2 border-green-200 text-green-700 hover:bg-green-50'
                            : 'bg-gray-100 border-2 border-gray-300 text-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <p className="text-2xl font-bold mb-0.5">{table.table_number}</p>
                          <p className="text-xs">{table.is_active ? '✓' : '✗'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicador visual de mesa seleccionada */}
              {selectedTableId && realTables.find(t => t.id === selectedTableId) && (
                <div className="p-2.5 bg-green-50 border-2 border-green-400 rounded-lg flex items-center gap-2 animate-fadeIn">
                  <span className="text-green-700 font-semibold text-xs flex-1">
                    ✓ Mesa {realTables.find(t => t.id === selectedTableId)?.table_number}
                  </span>
                  <button
                    onClick={() => {
                      onSelectTable('');
                      setSelectedRange('');
                    }}
                    className="text-xs bg-white text-gray-700 px-2.5 py-1 rounded-md hover:bg-gray-100 border border-gray-300 font-medium"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Mostrar mensaje confirmación para llevar */}
        {orderType === 'llevar' && (
          <div className="flex items-center justify-center py-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 rounded-xl p-6 text-center max-w-sm shadow-lg">
              <span className="text-5xl mb-3 block">🥡</span>
              <h3 className="text-lg font-bold text-green-800 mb-1">Orden Para Llevar</h3>
              <p className="text-sm text-green-700">
                Items empacados automáticamente
              </p>
              <div className="mt-3 bg-white rounded-lg px-3 py-1.5 inline-block">
                <p className="text-xs text-green-600 font-mono font-bold">
                  Mesa virtual: 9999
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mostrar mensaje confirmación para domicilio */}
        {orderType === 'domicilio' && (
          <div className="flex items-center justify-center py-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 rounded-xl p-6 text-center max-w-sm shadow-lg">
              <span className="text-5xl mb-3 block">🏍️</span>
              <h3 className="text-lg font-bold text-purple-800 mb-1">Orden a Domicilio</h3>
              <p className="text-sm text-purple-700">
                Se pedirán datos de entrega
              </p>
              <div className="mt-3 bg-white rounded-lg px-3 py-1.5 inline-block">
                <p className="text-xs text-purple-600 font-mono font-bold">
                  Mesa virtual: 9998
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint - Compacto */}
      <div className="flex-shrink-0 p-2 text-center bg-white border-t border-gray-200">
        <p className="text-xs text-gray-500">Selecciona una opción para continuar →</p>
      </div>

      {/* 🗺️ Modal de Mapa Visual Simplificado */}
      <SimpleTableMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        tables={tables}
        selectedTableId={selectedTableId}
        onSelectTable={(tableId: string) => {
          onSelectTable(tableId);
          setIsMapModalOpen(false);
          // Pre-seleccionar el rango correspondiente
          const selectedTable = tables.find(t => t.id === tableId);
          if (selectedTable) {
            const ranges = getTableRanges();
            const range = ranges.find(r =>
              selectedTable.table_number >= r.start && selectedTable.table_number <= r.end
            );
            if (range) {
              setSelectedRange(range.label);
            }
          }
        }}
      />
    </div>
  );
};

export default TablesSlide;

