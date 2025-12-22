
import React from 'react';
import MenuDisplay from '../components/MenuDisplay';
import type { MenuItem } from '../../../types/menu';

interface MenuSlideProps {
  selectedTableId: string;
  tableNumber?: number;
  orderType: string; // "mesa" | "llevar" | "domicilio"
  onAddToCart: (item: MenuItem) => void;
  onNavigateBack?: () => void;
}

const MenuSlide: React.FC<MenuSlideProps> = ({
  selectedTableId,
  tableNumber,
  orderType,
  onAddToCart,
  onNavigateBack
}) => {
  const getOrderTypeLabel = () => {
    switch (orderType) {
      case 'mesa':
        return { icon: '🍽️', label: 'Mesa', color: 'indigo' };
      case 'llevar':
        return { icon: '🥡', label: 'Para Llevar', color: 'green' };
      case 'domicilio':
        return { icon: '🏍️', label: 'Domicilio', color: 'purple' };
      default:
        return { icon: '📋', label: 'Orden', color: 'gray' };
    }
  };

  const orderTypeInfo = getOrderTypeLabel();

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header del Slide */}
      <div className="flex-shrink-0 p-4 pb-2">
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
        {selectedTableId && (
          <div className={`mt-2 p-3 rounded-lg border-2 bg-${orderTypeInfo.color}-50 border-${orderTypeInfo.color}-200`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{orderTypeInfo.icon}</span>
              <div>
                <p className={`text-sm font-bold text-${orderTypeInfo.color}-800`}>
                  {orderTypeInfo.label}
                </p>
                {orderType === 'mesa' && tableNumber && (
                  <p className="text-xs text-gray-600">Mesa {tableNumber}</p>
                )}
                {orderType === 'llevar' && (
                  <p className="text-xs text-green-600">Todo será empacado</p>
                )}
                {orderType === 'domicilio' && (
                  <p className="text-xs text-purple-600">Entrega a domicilio</p>
                )}
              </div>
            </div>
          </div>
        )}
        {!selectedTableId && (
          <p className="text-sm text-red-500 mt-1">
            ← Primero selecciona el tipo de orden
          </p>
        )}
      </div>

      {/* Contenedor con scroll - OPTIMIZADO PARA MÓVILES */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <MenuDisplay onAddToCart={onAddToCart} />
      </div>

      {/* Footer hint - Fijo */}
      <div className="flex-shrink-0 p-4 pt-2 text-center text-sm text-gray-500">
        <p>Desliza para ver la comanda →</p>
      </div>
    </div>
  );
};

export default MenuSlide;

