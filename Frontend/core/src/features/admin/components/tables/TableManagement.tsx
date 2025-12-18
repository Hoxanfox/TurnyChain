// =================================================================
// ARCHIVO 3: /src/features/admin/components/TableManagement.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTables, addNewTable } from './api/tablesSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';

const TableManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tables, status } = useSelector((state: RootState) => state.tables);
  const [newTableNumber, setNewTableNumber] = useState('');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTables());
    }
  }, [status, dispatch]);

  const handleCreateTable = () => {
    const tableNum = parseInt(newTableNumber, 10);
    if (!tableNum || tableNum <= 0) {
        alert("Por favor, ingrese un número de mesa válido.");
        return;
    }
    dispatch(addNewTable(tableNum));
    setNewTableNumber('');
  };

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <input
          type="number"
          value={newTableNumber}
          onChange={(e) => setNewTableNumber(e.target.value)}
          placeholder="Número de nueva mesa"
          className="px-3 py-2 border rounded-lg"
        />
        <button onClick={handleCreateTable} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          Añadir Mesa
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map(table => (
          <div key={table.id} className="p-4 bg-white rounded-lg shadow text-center">
            <p className="font-bold text-xl">Mesa {table.table_number}</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${table.is_active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
              {table.is_active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableManagement;