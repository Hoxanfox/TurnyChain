// =================================================================
// ARCHIVO 4: /src/features/admin/components/MenuItemModal.tsx (CORREGIDO)
// =================================================================
import React, { useState, type FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { addNewMenuItem, updateExistingMenuItem } from '../../menu/menuSlice';
import type { AppDispatch } from '../../../app/store';
import type { MenuItem } from '../../../types/menu';

interface MenuItemModalProps {
  item?: MenuItem | null;
  onClose: () => void;
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({ item, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price || 0);
  const [category, setCategory] = useState(item?.category || 'Platos Fuertes');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const itemData = { name, description, price, category, modifiers: item?.modifiers || {} };
    if (item) {
      dispatch(updateExistingMenuItem({ ...itemData, id: item.id, is_available: item.is_available }));
    } else {
      dispatch(addNewMenuItem(itemData));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{item ? 'Editar Ítem' : 'Crear Nuevo Ítem'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Precio</label>
            <input type="number" id="price" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
            <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemModal;