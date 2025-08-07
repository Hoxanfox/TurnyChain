// =================================================================
// ARCHIVO 10: /src/features/waiter/components/CurrentOrder.tsx (NUEVO ARCHIVO)
// =================================================================
import React from 'react';
import type { MenuItem } from '../../../types/menu';
import type { Table } from '../../../types/tables';

interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface CurrentOrderProps {
  cart: CartItem[];
  tableNumber: string;
  tables: Table[];
  onTableNumberChange: (value: string) => void;
  onCartAction: (item: CartItem, action: 'add' | 'remove' | 'delete') => void;
  onSendOrder: () => void;
  onEditItem: (item: CartItem) => void;
}

const CurrentOrder: React.FC<CurrentOrderProps> = ({ cart, tableNumber, tables, onTableNumberChange, onCartAction, onSendOrder, onEditItem }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="pb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Nueva Orden</h2>
      <div className="mb-4">
        <label htmlFor="table" className="block text-sm font-medium text-gray-700">Mesa N°</label>
        <select value={tableNumber} onChange={e => onTableNumberChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md">
          <option value="" disabled>Seleccione una mesa</option>
          {tables.map(table => (
              <option key={table.id} value={table.table_number}>{table.table_number}</option>
          ))}
        </select>
      </div>
      <div className="flex-grow space-y-2 mb-4 overflow-y-auto max-h-48">
        {cart.length === 0 && <p className="text-gray-500 text-center mt-10">El carrito está vacío</p>}
        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <button onClick={() => onEditItem(item)} className="w-full text-left">
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm">x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}</p>
              {item.notes && <p className="text-xs text-gray-500 italic">Nota: {item.notes}</p>}
            </button>
            <div className="flex items-center space-x-2">
              <button onClick={() => onCartAction(item, 'remove')} className="px-2 py-1 bg-gray-200 rounded">-</button>
              <button onClick={() => onCartAction(item, 'add')} className="px-2 py-1 bg-gray-200 rounded">+</button>
              <button onClick={() => onCartAction(item, 'delete')} className="text-red-500 hover:text-red-700">×</button>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t">
        <p className="text-lg font-bold flex justify-between">Total: <span>${total.toFixed(2)}</span></p>
        <button onClick={onSendOrder} className="mt-4 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400" disabled={!tableNumber || cart.length === 0}>Enviar Orden</button>
      </div>
    </div>
  );
};

export default CurrentOrder;
