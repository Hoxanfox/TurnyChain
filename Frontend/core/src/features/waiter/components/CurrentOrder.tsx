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
  onTableChange: (value: string) => void;
  onCartAction: (item: CartItem, action: 'delete') => void;
  onSendOrder: () => void;
  onEditItem: (item: CartItem) => void;
  onUpdateItemPrice?: (cartItemId: string, newPrice: number) => void;
  onIncrementQuantity?: (cartItemId: string) => void; // Nueva función
  onDecrementQuantity?: (cartItemId: string) => void; // Nueva función
}

const CurrentOrder: React.FC<CurrentOrderProps> = ({
  cart,
  tableId,
  tables,
  onTableChange,
  onCartAction,
  onSendOrder,
  onEditItem,
  onUpdateItemPrice,
  onIncrementQuantity,
  onDecrementQuantity
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

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
      <h2 className="text-xl font-bold mb-4 text-gray-800">Nueva Orden</h2>
      <div className="mb-4">
        <label htmlFor="table" className="block text-sm font-medium text-gray-700">Mesa</label>
        <select value={tableId} onChange={e => onTableChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md">
          <option value="" disabled>Seleccione una mesa</option>
          {tables.map(table => (
              <option key={table.id} value={table.id}>Mesa {table.table_number}</option>
          ))}
        </select>
      </div>
      <div className="flex-grow space-y-2 mb-4 overflow-y-auto">
        {cart.length === 0 && <p className="text-gray-500 text-center mt-10">El carrito está vacío</p>}
        {cart.map(item => {
          // Ingredientes que vienen originalmente con el plato
          const originalIngredients = item.ingredients || [];

          return (
            <div key={item.cartItemId} className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-base">{item.name}</p>

                  {/* Controles de Cantidad */}
                  {onIncrementQuantity && onDecrementQuantity && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium text-gray-600">Cantidad:</span>
                      <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md overflow-hidden">
                        <button
                          onClick={() => onDecrementQuantity(item.cartItemId)}
                          disabled={item.quantity <= 1}
                          className="px-3 py-1 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-lg"
                          title="Disminuir cantidad"
                        >
                          −
                        </button>
                        <span className="px-3 py-1 font-bold text-base min-w-[2rem] text-center bg-gray-50">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onIncrementQuantity(item.cartItemId)}
                          className="px-3 py-1 hover:bg-gray-100 transition-colors font-bold text-lg"
                          title="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {editingPriceId === item.cartItemId ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-medium">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 border rounded text-sm"
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
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-bold text-green-700">${item.finalPrice.toFixed(2)}</p>
                      {item.quantity > 1 && (
                        <span className="text-xs text-gray-500">
                          (${(item.finalPrice / item.quantity).toFixed(2)} c/u)
                        </span>
                      )}
                      {onUpdateItemPrice && (
                        <button
                          onClick={() => handleStartEditPrice(item)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                          title="Editar precio"
                        >
                          ✎
                        </button>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs italic text-gray-700">
                        📝 <span className="font-medium">Nota:</span> {item.notes}
                      </p>
                    </div>
                  )}

                  {/* CUSTOMIZACIONES - Vista previa de lo que SÍ lleva */}
                  {(() => {
                    // Calcular ingredientes activos (todos MENOS los removidos)
                    const activeIngredients = originalIngredients.filter(
                      ing => !item.removedIngredients.find(removed => removed.id === ing.id)
                    );

                    // Acompañantes seleccionados
                    const selectedAccompaniments = item.selectedAccompaniments;

                    const hasCustomizations = activeIngredients.length > 0 || selectedAccompaniments.length > 0;

                    if (!hasCustomizations) {
                      return (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs text-gray-500 italic">
                            Sin ingredientes ni acompañantes
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="mt-2 space-y-2">
                        {/* INGREDIENTES: Mostrar solo los activos */}
                        {activeIngredients.length > 0 && (
                          <div className="p-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-300 shadow-sm">
                            <p className="text-xs font-bold text-green-800 mb-1 flex items-center gap-1">
                              🥬 Ingredientes:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {activeIngredients.map(ing => (
                                <span key={ing.id} className="text-xs bg-white px-2 py-0.5 rounded border border-green-200 text-green-700">
                                  {ing.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Si no hay ingredientes */}
                        {activeIngredients.length === 0 && selectedAccompaniments.length > 0 && (
                          <div className="p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 italic">Sin ingredientes</p>
                          </div>
                        )}

                        {/* ACOMPAÑANTES: Mostrar solo los seleccionados */}
                        {selectedAccompaniments.length > 0 && (
                          <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-300 shadow-sm">
                            <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                              🍽️ Acompañantes:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {selectedAccompaniments.map(acc => (
                                <span key={acc.id} className="text-xs bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700">
                                  {acc.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Si no hay acompañantes */}
                        {selectedAccompaniments.length === 0 && activeIngredients.length > 0 && (
                          <div className="p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 italic">Sin acompañantes</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => onEditItem(item)}
                    className="text-blue-500 hover:text-blue-700 text-sm px-2"
                    title="Editar item completo"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onCartAction(item, 'delete')}
                    className="text-red-500 hover:text-red-700 text-xl"
                    title="Eliminar item"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pt-4 border-t">
        <p className="text-lg font-bold flex justify-between mb-4">
          Total: <span className="text-green-700">${total.toFixed(2)}</span>
        </p>

        {/* Indicador de que debe cobrar primero */}
        <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <p className="text-sm text-blue-800 font-semibold text-center">
            💳 Primero cobra, luego envía la comanda
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
