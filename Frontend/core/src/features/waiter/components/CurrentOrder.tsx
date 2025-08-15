// =================================================================
// ARCHIVO 2: /src/features/waiter/components/CurrentOrder.tsx (CORREGIDO)
// =================================================================
import React from 'react';
import type { CartItem } from '../../../types/menu';
import type { Table } from '../../../types/tables';

interface CurrentOrderProps {
  cart: CartItem[];
  tableId: string; // CORRECCIÓN: Se usa tableId
  tables: Table[];
  onTableChange: (value: string) => void; // CORRECCIÓN: Se usa onTableChange
  onCartAction: (item: CartItem, action: 'delete') => void;
  onSendOrder: () => void;
  onEditItem: (item: CartItem) => void;
}

const CurrentOrder: React.FC<CurrentOrderProps> = ({ cart, tableId, tables, onTableChange, onCartAction, onSendOrder, onEditItem }) => {
  const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);

  return (
    <div className="pb-4 flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Nueva Orden</h2>
      <div className="mb-4">
        <label htmlFor="table" className="block text-sm font-medium text-gray-700">Mesa</label>
        <select value={tableId} onChange={e => onTableChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md">
          <option value="" disabled>Seleccione una mesa</option>
          {tables.map(table => (
              <option key={table.id} value={table.id}>Mesa {table.table_number}</option>
          ))}
        </select>
      </div>
      <div className="flex-grow space-y-2 mb-4 overflow-y-auto">
        {cart.length === 0 && <p className="text-gray-500 text-center mt-10">El carrito está vacío</p>}
        {cart.map(item => {
          const removedAccompaniments = (item.accompaniments || []).filter(
            originalAcc => !item.selectedAccompaniments.find(selectedAcc => selectedAcc.id === originalAcc.id)
          );

          return (
            <div key={item.cartItemId} className="p-2 bg-gray-50 rounded">
              <div className="flex justify-between items-start">
                <button onClick={() => onEditItem(item)} className="w-full text-left">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm font-bold">${item.finalPrice.toFixed(2)}</p>
                  {item.notes && <p className="text-xs text-gray-500 italic mt-1">Nota: {item.notes}</p>}
                  {item.removedIngredients.length > 0 && <p className="text-xs text-red-500 mt-1">Sin: {item.removedIngredients.map(i => i.name).join(', ')}</p>}
                  {removedAccompaniments.length > 0 && <p className="text-xs text-red-500 mt-1">Sin Acompañante: {removedAccompaniments.map(a => a.name).join(', ')}</p>}
                </button>
                <button onClick={() => onCartAction(item, 'delete')} className="text-red-500 hover:text-red-700 text-xl ml-2">×</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pt-4 border-t">
        <p className="text-lg font-bold flex justify-between">Total: <span>${total.toFixed(2)}</span></p>
        <button onClick={onSendOrder} className="mt-4 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400" disabled={!tableId || cart.length === 0}>Enviar Orden</button>
      </div>
    </div>
  );
};

export default CurrentOrder;
