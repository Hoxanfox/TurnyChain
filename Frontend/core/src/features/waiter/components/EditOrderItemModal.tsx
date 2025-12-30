// =================================================================
// ARCHIVO 4: /src/features/waiter/components/EditOrderItemModal.tsx
// =================================================================
import React, { useState, type FormEvent } from 'react';
import type { MenuItem } from '../../../types/menu';

interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface EditOrderItemModalProps {
  item: CartItem;
  onUpdate: (updatedItem: CartItem) => void;
  onClose: () => void;
}

const EditOrderItemModal: React.FC<EditOrderItemModalProps> = ({ item, onUpdate, onClose }) => {
  const [price, setPrice] = useState(item.price);
  const [notes, setNotes] = useState(item.notes || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdate({ ...item, price, notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Editar: {item.name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700">Precio Unitario</label>
            <input id="edit-price" type="number" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="mt-1 block w-full px-3 py-2 border rounded-md"/>
          </div>
          <div className="mb-4">
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">Notas</label>
            <textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Ej: Sin cebolla, término medio..."/>
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrderItemModal;