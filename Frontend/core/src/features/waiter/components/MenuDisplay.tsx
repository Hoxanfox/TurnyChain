// =================================================================
// ARCHIVO 9: /src/features/waiter/components/MenuDisplay.tsx (NUEVO ARCHIVO)
// =================================================================
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenu } from '../../admin/components/menu/api/menuSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import type { MenuItem } from '../../../types/menu';

interface MenuDisplayProps {
  onAddToCart: (item: MenuItem) => void;
}

const MenuDisplay: React.FC<MenuDisplayProps> = ({ onAddToCart }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: menuItems, status: menuStatus } = useSelector((state: RootState) => state.menu);

  useEffect(() => {
    if (menuStatus === 'idle') {
      dispatch(fetchMenu());
    }
  }, [menuStatus, dispatch]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Menú</h2>
      {menuStatus === 'loading' && <p>Cargando menú...</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {menuItems.map(item => (
          <button key={item.id} onClick={() => onAddToCart(item)} className="p-4 bg-white rounded-lg shadow text-center hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <p className="font-semibold text-gray-700">{item.name}</p>
            <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuDisplay;
