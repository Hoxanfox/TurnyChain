// =================================================================
// ARCHIVO 2: /src/features/waiter/components/CurrentOrder.tsx (MEJORADO)
// =================================================================
import React, { useState } from 'react';
import type { CartItem } from '../../../types/menu';
import type { Table } from '../../../types/tables';

interface CurrentOrderProps {
  cart: CartItem[];
  tableId: string;
  tables: Table[];
  orderType: string; // "mesa" | "llevar" | "domicilio"
  onTableChange: (value: string) => void;
  onCartAction: (item: CartItem, action: 'delete') => void;
  onSendOrder: (takeoutNotes?: string) => void;
  onEditItem: (item: CartItem) => void;
  onUpdateItemPrice?: (cartItemId: string, newPrice: number) => void;
  onIncrementQuantity?: (cartItemId: string) => void; // Nueva función
  onDecrementQuantity?: (cartItemId: string) => void; // Nueva función
  onToggleTakeout?: (cartItemId: string) => void; // Nueva función para toggle is_takeout
}

const CurrentOrder: React.FC<CurrentOrderProps> = ({
  cart,
  tableId,
  tables: _tables,
  orderType,
  onTableChange: _onTableChange,
  onCartAction,
  onSendOrder,
  onEditItem,
  onUpdateItemPrice,
  onIncrementQuantity,
  onDecrementQuantity,
  onToggleTakeout
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  // Estado para notas adicionales en pedidos para llevar
  const [takeoutNotes, setTakeoutNotes] = useState("");

  const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);

  const handleStartEditPrice = (item: CartItem) => {
    setEditingPriceId(item.cartItemId);
    setTempPrice(item.finalPrice);
  };

  const handleSavePrice = (item: CartItem) => {
    if (onUpdateItemPrice && tempPrice > 0) {
      onUpdateItemPrice(item.cartItemId, tempPrice);
    }
    setEditingPriceId(null);
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setTempPrice(0);
  };


  return (
    <div className="pb-4 flex flex-col h-full">
      {/* Encabezado de sección */}
      <div className="flex items-center justify-between mb-4 mt-1">
        <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">Pedido Actual</h2>
        {cart.length > 0 && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {cart.reduce((s, i) => s + i.quantity, 0)} Items
          </span>
        )}
      </div>
      {/* Campo de notas obligatorias para llevar */}
      {orderType === 'llevar' && (
        <div className="mb-4">
          <label htmlFor="takeoutNotes" className="block text-sm font-semibold text-red-700 mb-2">Notas especiales para llevar <span className="text-red-500">(obligatorio)</span></label>
          <textarea
            id="takeoutNotes"
            value={takeoutNotes}
            onChange={e => setTakeoutNotes(e.target.value)}
            placeholder="Ej: Nombre para reclamar, instrucciones, etc."
            rows={2}
            className="w-full px-4 py-2 border-2 border-red-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
            required
          />
          {takeoutNotes.trim() === '' && (
            <p className="text-xs text-red-600 mt-1">Debes ingresar una nota especial para pedidos para llevar.</p>
          )}
        </div>
      )}

      {/* Aviso si no hay mesa seleccionada */}
      {orderType === 'mesa' && !tableId && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <p className="text-xs text-amber-700 font-medium text-center">
            ⚠️ Toca «Cambiar Mesa» arriba para elegir una mesa
          </p>
        </div>
      )}

<div className="flex-grow space-y-3 mb-4 overflow-y-auto">
        {cart.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-10">El carrito está vacío</p>
        )}
        {cart.map((item) => {
          const removedIngredients = item.removedIngredients || [];
          const selectedAccompaniments = item.selectedAccompaniments || [];

          // Línea de personalización visible
          const customParts: string[] = [];
          if (removedIngredients.length > 0)
            customParts.push(`Sin ${removedIngredients.map(r => r.name).join(', ')}`);
          if (selectedAccompaniments.length > 0)
            customParts.push(selectedAccompaniments.map(a => a.name).join(', '));
          if (item.notes) customParts.push(item.notes);
          const customSummary = customParts.join(' · ');

          return (
            <div
              key={item.cartItemId}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="flex items-start p-3 gap-3">
                {/* Imagen del producto */}
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍽️
                    </div>
                  )}
                </div>

                {/* Info central */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                      {customSummary && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{customSummary}</p>
                      )}
                    </div>
                    {/* Precio */}
                    {editingPriceId === item.cartItemId ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(parseFloat(e.target.value))}
                          className="w-20 px-2 py-0.5 border rounded text-sm"
                          autoFocus
                        />
                        <button onClick={() => handleSavePrice(item)} className="text-green-600 text-sm font-bold">✓</button>
                        <button onClick={handleCancelEditPrice} className="text-red-500 text-sm font-bold">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onUpdateItemPrice && handleStartEditPrice(item)}
                        className={`flex-shrink-0 text-right ${onUpdateItemPrice ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
                        disabled={!onUpdateItemPrice}
                      >
                        <span className="text-sm font-bold text-indigo-600">
                          ${item.finalPrice.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Controles de cantidad + botones acción */}
                  <div className="flex items-center justify-between mt-2">
                    {/* Cantidad */}
                    {onIncrementQuantity && onDecrementQuantity ? (
                      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                        <button
                          onClick={() => onDecrementQuantity(item.cartItemId)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-colors"
                        >
                          −
                        </button>
                        <span className="px-2.5 text-sm font-bold text-gray-800 min-w-[1.75rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onIncrementQuantity(item.cartItemId)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-base font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">x{item.quantity}</span>
                    )}

                    {/* Botones editar + eliminar */}
                    <div className="flex items-center gap-1">
                      {/* Toggle llevar/aquí */}
                      {orderType === 'mesa' && onToggleTakeout && (
                        <button
                          onClick={() => onToggleTakeout(item.cartItemId)}
                          className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                            item.is_takeout
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}
                          title="Cambiar tipo"
                        >
                          {item.is_takeout ? '🥡' : '🍽️'}
                        </button>
                      )}
                      <button
                        onClick={() => onEditItem(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onCartAction(item, 'delete')}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: Total + Botón */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-gray-800">Total</span>
          <span className="text-xl font-extrabold text-indigo-600">
            ${total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <button
          onClick={() => onSendOrder(orderType === 'llevar' ? takeoutNotes : undefined)}
          className="mt-2 w-full bg-indigo-600 text-white py-3 rounded-2xl hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-bold text-sm shadow-md disabled:shadow-none"
          disabled={!tableId || cart.length === 0 || (orderType === 'llevar' && takeoutNotes.trim() === '')}
        >
          Cobrar y Enviar Orden
        </button>
      </div>
    </div>
  );
};

export default CurrentOrder;
