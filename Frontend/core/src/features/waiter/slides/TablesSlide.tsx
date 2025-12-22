import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTables } from '../../admin/components/tables/api/tablesSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';

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

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTables());
    }
  }, [status, dispatch]);

  const handleTableClick = (tableId: string) => {
    onSelectTable(tableId);
    onRequestChangeSlide?.();
  };

  const handleOrderTypeChange = (type: string) => {
    onOrderTypeChange(type);

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

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header del Slide */}
      <div className="flex-shrink-0 p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Tipo de Orden</h2>
        </div>

        {/* Selector de Tipo de Orden */}
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleOrderTypeChange('mesa')}
            className={`p-4 rounded-xl shadow-lg transition-all transform hover:scale-105 ${
              orderType === 'mesa'
                ? 'bg-indigo-600 text-white ring-4 ring-indigo-300'
                : 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-800 hover:from-indigo-100 hover:to-indigo-200'
            }`}
          >
            <div className="text-center">
              <span className="text-4xl mb-2 block">🍽️</span>
              <p className="text-sm font-bold">MESA</p>
              <p className="text-xs mt-1 opacity-80">Consumo en local</p>
            </div>
          </button>

          <button
            onClick={() => handleOrderTypeChange('llevar')}
            className={`p-4 rounded-xl shadow-lg transition-all transform hover:scale-105 ${
              orderType === 'llevar'
                ? 'bg-green-600 text-white ring-4 ring-green-300'
                : 'bg-gradient-to-br from-green-50 to-green-100 text-green-800 hover:from-green-100 hover:to-green-200'
            }`}
          >
            <div className="text-center">
              <span className="text-4xl mb-2 block">🥡</span>
              <p className="text-sm font-bold">LLEVAR</p>
              <p className="text-xs mt-1 opacity-80">Para recoger</p>
            </div>
          </button>

          <button
            onClick={() => handleOrderTypeChange('domicilio')}
            className={`p-4 rounded-xl shadow-lg transition-all transform hover:scale-105 ${
              orderType === 'domicilio'
                ? 'bg-purple-600 text-white ring-4 ring-purple-300'
                : 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-800 hover:from-purple-100 hover:to-purple-200'
            }`}
          >
            <div className="text-center">
              <span className="text-4xl mb-2 block">🏍️</span>
              <p className="text-sm font-bold">DOMICILIO</p>
              <p className="text-xs mt-1 opacity-80">Entrega a casa</p>
            </div>
          </button>
          </div>
        </div>
      </div>

      {/* Contenedor con scroll - OPTIMIZADO PARA MÓVILES */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4">
        {/* Mostrar selector de mesas solo si es tipo "mesa" */}
        {orderType === 'mesa' && (
          <>
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Seleccionar Mesa</h3>
            </div>
            {status === 'loading' && <p className="text-gray-600">Cargando mesas...</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
              {realTables.map(table => (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table.id)}
                  className={`p-6 rounded-lg shadow-lg transition-all transform hover:scale-105 ${
                    selectedTableId === table.id
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-300'
                      : table.is_active
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-1">{table.table_number}</p>
                    <p className="text-sm capitalize">{table.is_active ? 'Disponible' : 'Inactiva'}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Mostrar mensaje confirmación para llevar */}
        {orderType === 'llevar' && (
          <div className="flex items-center justify-center py-8">
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 text-center max-w-md">
              <span className="text-6xl mb-4 block">🥡</span>
              <h3 className="text-xl font-bold text-green-800 mb-2">Orden Para Llevar</h3>
              <p className="text-sm text-green-700">
                Todos los items serán empacados automáticamente.
              </p>
              <p className="text-xs text-green-600 mt-2">
                Mesa virtual: 9999
              </p>
            </div>
          </div>
        )}

        {/* Mostrar mensaje confirmación para domicilio */}
        {orderType === 'domicilio' && (
          <div className="flex items-center justify-center py-8">
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-8 text-center max-w-md">
              <span className="text-6xl mb-4 block">🏍️</span>
              <h3 className="text-xl font-bold text-purple-800 mb-2">Orden a Domicilio</h3>
              <p className="text-sm text-purple-700">
                Se solicitarán los datos de entrega antes de enviar la orden.
              </p>
              <p className="text-xs text-purple-600 mt-2">
                Mesa virtual: 9998
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint - Fijo */}
      <div className="flex-shrink-0 p-4 pt-2 text-center text-sm text-gray-500">
        <p>Selecciona una opción para continuar →</p>
      </div>
    </div>
  );
};

export default TablesSlide;

