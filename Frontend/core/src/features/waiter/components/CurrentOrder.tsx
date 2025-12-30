// =================================================================
// ARCHIVO 2: /src/features/waiter/components/CurrentOrder.tsx (MEJORADO)
// =================================================================
import React, { useState } from 'react';
import { FaMapMarkedAlt } from 'react-icons/fa';
import type { CartItem } from '../../../types/menu';
import type { Table } from '../../../types/tables';
import TableMapModal from './TableMapModal';

interface CurrentOrderProps {
  cart: CartItem[];
  tableId: string;
  tables: Table[];
  orderType: string; // "mesa" | "llevar" | "domicilio"
  onTableChange: (value: string) => void;
  onCartAction: (item: CartItem, action: 'delete') => void;
  onSendOrder: () => void;
  onEditItem: (item: CartItem) => void;
  onUpdateItemPrice?: (cartItemId: string, newPrice: number) => void;
  onIncrementQuantity?: (cartItemId: string) => void; // Nueva función
  onDecrementQuantity?: (cartItemId: string) => void; // Nueva función
  onToggleTakeout?: (cartItemId: string) => void; // Nueva función para toggle is_takeout
}

const CurrentOrder: React.FC<CurrentOrderProps> = ({
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
  onToggleTakeout
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  // 🆕 MEJORA UX #2: Estado para colapsar/expandir detalles (Reducir Carga Cognitiva)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // 🆕 MEJORA UX #6: Estado para modal de mapa de mesas
  const [showTableMap, setShowTableMap] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);


  const toggleExpand = (cartItemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cartItemId)) {
        newSet.delete(cartItemId);
      } else {
        newSet.add(cartItemId);
      }
      return newSet;
    });
  };

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
      <h2 className="text-xl font-bold mb-4 text-gray-800">Nueva Orden</h2>

      {/* 🆕 MEJORA UX #6: Selector compacto de mesa en una línea con modal */}
      {orderType === 'mesa' && (
        <div className="mb-4 flex items-center gap-2">
          {tableId ? (
            // Mesa seleccionada - mostrar badge compacto
            <div className="flex-1 flex items-center justify-between bg-green-50 border-2 border-green-300 rounded-lg px-3 py-2">
              <span className="text-green-700 font-semibold text-sm flex items-center gap-2">
                ✓ Mesa {tables.find(t => t.id === tableId)?.table_number}
              </span>
              <button
                onClick={() => onTableChange('')}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Cambiar
              </button>
            </div>
          ) : (
            // No hay mesa seleccionada - mostrar mensaje
            <div className="flex-1 bg-yellow-50 border-2 border-yellow-300 rounded-lg px-3 py-2">
              <span className="text-yellow-800 text-sm font-medium">
                ⚠️ Selecciona una mesa
              </span>
            </div>
          )}

          {/* Botón para abrir mapa de mesas */}
          <button
            onClick={() => setShowTableMap(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg"
            title="Abrir mapa de mesas"
          >
            <FaMapMarkedAlt className="text-lg" />
            <span className="hidden sm:inline">Mapa</span>
          </button>
        </div>
      )}

      {/* Modal de Mapa de Mesas */}
      <TableMapModal
        isOpen={showTableMap}
        onClose={() => setShowTableMap(false)}
        tables={tables}
        selectedTableId={tableId}
        onSelectTable={onTableChange}
      />

      <div className="flex-grow space-y-2 mb-4 overflow-y-auto">
        {cart.length === 0 && <p className="text-gray-500 text-center mt-10">El carrito está vacío</p>}
        {cart.map((item, index) => {
          // Ingredientes que vienen originalmente con el plato
          const originalIngredients = item.ingredients || [];
          const isExpanded = expandedItems.has(item.cartItemId);

          return (
            <div key={item.cartItemId} className="relative p-2 bg-white rounded border border-gray-200">
              {/* Badge de número de item - COMPACTO */}
              <div className="absolute -top-2 -left-2 z-10">
                <div className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow">
                  {index + 1}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 ml-4">
                  {/* INFORMACIÓN SIEMPRE VISIBLE */}
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-sm text-gray-800 flex-1">{item.name}</p>
                    <button
                      onClick={() => toggleExpand(item.cartItemId)}
                      className="text-gray-500 hover:text-gray-700 p-1 ml-2"
                      title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Controles de Cantidad - SIEMPRE VISIBLE */}
                  {onIncrementQuantity && onDecrementQuantity && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-600">Cant:</span>
                      <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                        <button
                          onClick={() => onDecrementQuantity(item.cartItemId)}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
                        >
                          −
                        </button>
                        <div className="px-3 py-1 text-sm font-bold border-x border-gray-300 min-w-[2.5rem] text-center">
                          {item.quantity}
                        </div>
                        <button
                          onClick={() => onIncrementQuantity(item.cartItemId)}
                          className="px-2 py-1 hover:bg-gray-100 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PRECIO - SIEMPRE VISIBLE */}
                  {editingPriceId === item.cartItemId ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-medium">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePrice(item)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEditPrice}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-green-600">
                          ${item.finalPrice.toFixed(2)}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-gray-500">
                            (${(item.finalPrice / item.quantity).toFixed(2)} c/u)
                          </span>
                        )}
                      </div>
                      {onUpdateItemPrice && (
                        <button
                          onClick={() => handleStartEditPrice(item)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Editar precio"
                        >
                          <span className="text-sm">✎</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* DETALLES COLAPSABLES */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t pt-2">
                      {/* Toggle Para Llevar/Mesa - 🆕 MEJORA UX #4: Solo si tipo = mesa */}
                      {orderType === 'mesa' && onToggleTakeout && (
                        <div>
                          <button
                            onClick={() => onToggleTakeout(item.cartItemId)}
                            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-colors ${
                              item.is_takeout
                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            <span>{item.is_takeout ? '🥡' : '🍽️'}</span>
                            <span>{item.is_takeout ? 'P/Llevar' : 'Aquí'}</span>
                          </button>
                        </div>
                      )}

                      {/* Badge para llevar o domicilio */}
                      {(orderType === 'llevar' || orderType === 'domicilio') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                          🥡 P/Llevar
                        </span>
                      )}

                      {/* Notas */}
                      {item.notes && (
                        <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-xs italic text-gray-700">
                            📝 {item.notes}
                          </p>
                        </div>
                      )}

                      {/* CUSTOMIZACIONES */}
                      {(() => {
                        const activeIngredients = originalIngredients.filter(
                          ing => !item.removedIngredients.find(removed => removed.id === ing.id)
                        );
                        const selectedAccompaniments = item.selectedAccompaniments;
                        const hasCustomizations = activeIngredients.length > 0 || selectedAccompaniments.length > 0;

                        if (!hasCustomizations) return null;

                        return (
                          <div className="space-y-1">
                            {/* INGREDIENTES */}
                            {activeIngredients.length > 0 && (
                              <div className="p-1.5 bg-green-50 rounded border border-green-200">
                                <p className="text-xs font-semibold text-green-700 mb-1">🥬 Ingredientes:</p>
                                <div className="flex flex-wrap gap-1">
                                  {activeIngredients.map(ing => (
                                    <span key={ing.id} className="text-xs bg-white px-1.5 py-0.5 rounded border border-green-200 text-green-700">
                                      {ing.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ACOMPAÑANTES */}
                            {selectedAccompaniments.length > 0 && (
                              <div className="p-1.5 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs font-semibold text-blue-700 mb-1">🍽️ Acompañantes:</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedAccompaniments.map(acc => (
                                    <span key={acc.id} className="text-xs bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-700">
                                      {acc.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Botones de acción - COMPACTO */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onEditItem(item)}
                    className="text-blue-600 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onCartAction(item, 'delete')}
                    className="text-red-600 hover:text-red-700 p-1.5 rounded hover:bg-red-50"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pt-3 border-t border-gray-200 bg-white">
        {/* Total compacto */}
        <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-800">${total.toFixed(2)}</p>
            </div>
            {cart.length > 0 && (
              <div className="text-right text-xs text-gray-500">
                <p>{cart.length} prod.</p>
                <p>{cart.reduce((sum, item) => sum + item.quantity, 0)} unid.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recordatorio compacto */}
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-700 text-center font-medium">
            💳 Cobra primero, luego envía
          </p>
        </div>

        <button
          onClick={onSendOrder}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:from-green-700 hover:to-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-bold shadow-lg disabled:shadow-none"
          disabled={!tableId || cart.length === 0}
        >
          💰 Cobrar y Enviar Orden
        </button>
      </div>
    </div>
  );
};

export default CurrentOrder;
