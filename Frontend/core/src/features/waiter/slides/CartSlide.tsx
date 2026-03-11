import React, { useState } from 'react';
import CurrentOrder from '../components/CurrentOrder';
import TableMapModal from '../components/TableMapModal';
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
  const [showTableMap, setShowTableMap] = useState(false);

  // Obtener nombre de la mesa activa
  const activeTable = tables.find(t => t.id === tableId);
  const tableName = activeTable
    ? `Mesa ${activeTable.table_number}`
    : orderType === 'llevar'
    ? 'Para Llevar'
    : orderType === 'domicilio'
    ? 'Domicilio'
    : 'Sin mesa';

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">
      {/* Header principal */}
      <div className="flex-shrink-0 bg-white px-4 pt-4 pb-3 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="text-gray-500 hover:text-gray-800 transition-colors p-1 -ml-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{tableName}</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">Comanda activa</p>
          </div>
          {orderType === 'mesa' && (
            <button
              onClick={() => setShowTableMap(true)}
              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors text-sm font-semibold rounded-lg whitespace-nowrap"
            >
              Cambiar Mesa
            </button>
          )}
        </div>

        {cart.length === 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700 text-center">
              Carrito vacío.{' '}
              <button
                onClick={onNavigateToMenu}
                className="underline font-semibold hover:text-amber-900"
              >
                Ir al menú
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Contenedor con scroll */}
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

      {/* Mapa de mesas — absolute dentro del slide (relative) */}
      <TableMapModal
        isOpen={showTableMap}
        onClose={() => setShowTableMap(false)}
        tables={tables}
        selectedTableId={tableId}
        onSelectTable={(id) => {
          onTableChange(id);
          setShowTableMap(false);
        }}
      />
    </div>
  );
};

export default CartSlide;

