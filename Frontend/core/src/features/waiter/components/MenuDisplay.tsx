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
    <div className="pb-4">
      {menuStatus === 'loading' && (
        <div className="flex justify-center items-center py-8">
          <p className="text-gray-500">Cargando menú...</p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onAddToCart(item)}
            className="p-4 bg-white rounded-lg shadow-sm text-center hover:bg-indigo-50 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95"
          >
            <p className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">{item.name}</p>
            <p className="text-lg font-bold text-indigo-600">${item.price.toFixed(2)}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuDisplay;
