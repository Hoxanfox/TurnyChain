// =================================================================
// ARCHIVO 5: /src/features/admin/components/MenuManagement.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenu, softDeleteMenuItem } from '../../menu/menuSlice';
import type { AppDispatch, RootState } from '../../../app/store';
import type { MenuItem } from '../../../types/menu';
import MenuItemModal from './MenuItemModal';

const MenuManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, status } = useSelector((state: RootState) => state.menu);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMenu());
    }
  }, [status, dispatch]);

  const handleOpenModal = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };
  
  const handleDelete = (itemId: string) => {
    if (window.confirm('¿Estás seguro de que quieres desactivar este ítem?')) {
        dispatch(softDeleteMenuItem(itemId));
    }
  };

  return (
    <div>
      <button onClick={() => handleOpenModal()} className="bg-green-500 text-white px-4 py-2 rounded-lg mb-4 hover:bg-green-600">
        Añadir Nuevo Ítem
      </button>
      <table className="min-w-full bg-white">
        {/* ... (table header) ... */}
        <tbody className="divide-y divide-gray-200">
          {items.map(item => (
            <tr key={item.id}>
              <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{item.category}</td>
              <td className="px-6 py-4 whitespace-nowrap">${item.price.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Desactivar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isModalOpen && <MenuItemModal item={editingItem} onClose={handleCloseModal} />}
    </div>
  );
};

export default MenuManagement;