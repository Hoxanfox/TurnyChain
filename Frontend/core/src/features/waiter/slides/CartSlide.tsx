import React from 'react';
import CurrentOrder from '../components/CurrentOrder';
import type { CartItem } from '../../../types/menu';
import type { Table } from '../../../types/tables';

interface CartSlideProps {
  cart: CartItem[];
  tableId: string;
  tables: Table[];
  orderType: string; // "mesa" | "llevar" | "domicilio"
  onTableChange: (value: string) => void;
  onCartAction: (item: CartItem, action: 'delete') => void;
  onSendOrder: () => void;
  onEditItem: (item: CartItem) => void;
  onUpdateItemPrice?: (cartItemId: string, newPrice: number) => void;
  onIncrementQuantity?: (cartItemId: string) => void;
  onDecrementQuantity?: (cartItemId: string) => void;
  onToggleTakeout?: (cartItemId: string) => void;
  onNavigateToMenu?: () => void;
  onNavigateBack?: () => void;
}

const CartSlide: React.FC<CartSlideProps> = ({
  cart,
  tableId,
  tables,
  orderType,
  onTableChange,
  onCartAction,
  onSendOrder,
  onEditItem,
  onUpdateItemPrice,
  onIncrementQuantity,
  onDecrementQuantity,
  onToggleTakeout,
  onNavigateToMenu,
  onNavigateBack
}) => {
  // Calcular total de items (sumando cantidades)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.finalPrice, 0);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header del Slide - OPTIMIZADO MÓVIL */}
      <div className="flex-shrink-0 bg-white shadow-sm p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {onNavigateBack && (
              <button
                onClick={onNavigateBack}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-800">🛒 Comanda</h2>
          </div>

          {/* Contador compacto */}
          {cart.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{cart.length}p</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{totalItems}u</span>
              <span className="text-gray-400">•</span>
              <span className="font-bold text-green-600">${totalPrice.toFixed(2)}</span>
            </div>
          )}
        </div>

        {cart.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
            <p className="text-xs text-yellow-800 text-center">
              Carrito vacío.{' '}
              <button
                onClick={onNavigateToMenu}
                className="underline font-semibold hover:text-yellow-900"
              >
                Ir al menú
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Contenedor con scroll - OPTIMIZADO PARA MÓVILES */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4">
        <CurrentOrder
          cart={cart}
          tableId={tableId}
          tables={tables}
          orderType={orderType}
          onTableChange={onTableChange}
          onCartAction={onCartAction}
          onSendOrder={onSendOrder}
          onEditItem={onEditItem}
          onUpdateItemPrice={onUpdateItemPrice}
          onIncrementQuantity={onIncrementQuantity}
          onDecrementQuantity={onDecrementQuantity}
          onToggleTakeout={onToggleTakeout}
        />
      </div>
    </div>
  );
};

export default CartSlide;

