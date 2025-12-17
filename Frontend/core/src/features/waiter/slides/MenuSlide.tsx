
import React from 'react';
import MenuDisplay from '../components/MenuDisplay';
import type { MenuItem } from '../../../types/menu';

interface MenuSlideProps {
  selectedTableId: string;
  tableNumber?: number;
  onAddToCart: (item: MenuItem) => void;
  onNavigateBack?: () => void;
}

const MenuSlide: React.FC<MenuSlideProps> = ({ selectedTableId, tableNumber, onAddToCart, onNavigateBack }) => {
  return (
    <div className="h-full flex flex-col bg-gray-50 p-4">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Mesas</span>
            </button>
          )}
          <h2 className="text-2xl font-bold text-gray-800">Menú</h2>
        </div>
        {selectedTableId && tableNumber && (
          <p className="text-sm text-gray-600 mt-1">
            Agregando platos para <span className="font-semibold">Mesa {tableNumber}</span>
          </p>
        )}
        {!selectedTableId && (
          <p className="text-sm text-red-500 mt-1">
            ← Primero selecciona una mesa
          </p>
        )}
      </div>
      <div className="flex-grow overflow-y-auto">
        <MenuDisplay onAddToCart={onAddToCart} />
      </div>
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Desliza para ver la comanda →</p>
      </div>
    </div>
  );
};

export default MenuSlide;

