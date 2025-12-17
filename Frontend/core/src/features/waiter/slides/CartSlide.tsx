import React from 'react';
import CurrentOrder from '../components/CurrentOrder';
import type { CartItem } from '../../../types/menu';
import type { Table } from '../../../types/tables';

interface CartSlideProps {
  cart: CartItem[];
  tableId: string;
  tables: Table[];
  onTableChange: (value: string) => void;
  onCartAction: (item: CartItem, action: 'delete') => void;
  onSendOrder: () => void;
  onEditItem: (item: CartItem) => void;
  onUpdateItemPrice?: (cartItemId: string, newPrice: number) => void;
  onNavigateToMenu?: () => void;
  onNavigateBack?: () => void;
}

const CartSlide: React.FC<CartSlideProps> = ({
  cart,
  tableId,
  tables,
  onTableChange,
  onCartAction,
  onSendOrder,
  onEditItem,
  onUpdateItemPrice,
  onNavigateToMenu,
  onNavigateBack
}) => {
  return (
    <div className="h-full flex flex-col bg-white p-4">
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
              <span className="text-sm font-medium">Menú</span>
            </button>
          )}
          <h2 className="text-2xl font-bold text-gray-800">Comanda</h2>
        </div>
      </div>
      {cart.length === 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800 text-center">
            El carrito está vacío.{' '}
            <button
              onClick={onNavigateToMenu}
              className="underline font-semibold hover:text-yellow-900"
            >
              ← Ir al menú
            </button>
          </p>
        </div>
      )}
      <CurrentOrder
        cart={cart}
        tableId={tableId}
        tables={tables}
        onTableChange={onTableChange}
        onCartAction={onCartAction}
        onSendOrder={onSendOrder}
        onEditItem={onEditItem}
        onUpdateItemPrice={onUpdateItemPrice}
      />
    </div>
  );
};

export default CartSlide;

