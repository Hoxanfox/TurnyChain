import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTables } from '../../tables/tablesSlice';
import type { AppDispatch, RootState } from '../../../app/store';

interface TablesSlideProps {
  selectedTableId: string;
  onSelectTable: (tableId: string) => void;
  onRequestChangeSlide?: () => void;
}

const TablesSlide: React.FC<TablesSlideProps> = ({ selectedTableId, onSelectTable, onRequestChangeSlide }) => {
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

  return (
    <div className="h-full flex flex-col bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Seleccionar Mesa</h2>
      </div>
      {status === 'loading' && <p className="text-gray-600">Cargando mesas...</p>}
      <div className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {tables.map(table => (
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
      </div>
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Selecciona una mesa para continuar →</p>
      </div>
    </div>
  );
};

export default TablesSlide;

