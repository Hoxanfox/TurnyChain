// =================================================================
// ARCHIVO 1: /src/features/shared/OrderDetailModal.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderDetails } from '../orders/ordersSlice';
import type { AppDispatch, RootState } from '../../app/store';
import type { OrderItem } from '../../types/orders';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  editable?: boolean; // Nueva prop para controlar si se puede editar
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, onClose, editable = false }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedOrderDetails, detailsStatus } = useSelector((state: RootState) => state.orders);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState<string>('');

  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderDetails(orderId));
    }
  }, [orderId, dispatch]);

  // Debug: Ver qué datos están llegando del backend
  useEffect(() => {
    if (selectedOrderDetails && selectedOrderDetails.items.length > 0) {
      const firstItem = selectedOrderDetails.items[0];

      console.log('🔍 DEBUG - Detalle de Orden (NUEVO FORMATO):', {
        orderId: selectedOrderDetails.id,
        totalItems: selectedOrderDetails.items.length,
        primerItem: firstItem,
        customizations: firstItem.customizations,
        active_ingredients: firstItem.customizations?.active_ingredients || [],
        selected_accompaniments: firstItem.customizations?.selected_accompaniments || [],
      });
    }
  }, [selectedOrderDetails]);

  const handleEditItem = (index: number, item: OrderItem) => {
    setEditingItemIndex(index);
    setEditedPrice(item.price_at_order);
    setEditedNotes(item.notes || '');
  };

  const handleSaveEdit = () => {
    // Aquí deberías implementar la lógica para guardar los cambios
    // Por ahora solo cerramos el modo de edición
    alert('Funcionalidad de guardar en desarrollo. Conecta con tu backend.');
    setEditingItemIndex(null);
  };

  const handleDeleteItem = (index: number) => {
    if (confirm('¿Estás seguro de eliminar este item?')) {
      // Aquí deberías implementar la lógica para eliminar el item
      console.log('Eliminando item en el índice:', index);
      alert('Funcionalidad de eliminar en desarrollo. Conecta con tu backend.');
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold">Detalle de la Orden</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-600 hover:text-gray-900">&times;</button>
        </div>
        {detailsStatus === 'loading' && <p>Cargando detalles...</p>}
        {detailsStatus === 'succeeded' && selectedOrderDetails && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <p><strong>Mesa:</strong> {selectedOrderDetails.table_number}</p>
              <p><strong>Estado:</strong> <span className="font-semibold text-blue-600">{selectedOrderDetails.status}</span></p>
              <p><strong>Total:</strong> <span className="font-bold">${selectedOrderDetails.total.toFixed(2)}</span></p>
              <p><strong>Mesero:</strong> {selectedOrderDetails.waiter_name || <span className="text-gray-400 text-sm">(ID: {selectedOrderDetails.waiter_id.substring(0, 8)}...)</span>}</p>
            </div>
            <h3 className="font-bold mt-4 mb-2 border-t pt-2">Ítems:</h3>
            <ul className="space-y-3">
              {selectedOrderDetails.items.map((item, index) => {
                return (
                  <li key={index} className="p-3 bg-gray-50 rounded border">
                    {editingItemIndex === index ? (
                      // Modo de edición
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-lg">{item.menu_item_name}</p>
                          <button
                            onClick={() => setEditingItemIndex(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Cantidad:</label>
                          <p className="mt-1 text-lg font-semibold">{item.quantity}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Precio unitario:</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editedPrice}
                            onChange={(e) => setEditedPrice(parseFloat(e.target.value))}
                            className="mt-1 block w-full px-3 py-2 border rounded-md"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Notas:</label>
                          <textarea
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border rounded-md"
                            rows={2}
                          />
                        </div>

                        {/* Mostrar ingredientes activos (solo lectura en edición) */}
                        {item.customizations?.active_ingredients && item.customizations.active_ingredients.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes:</label>
                            <div className="flex flex-wrap gap-2">
                              {item.customizations.active_ingredients.map(ing => (
                                <span
                                  key={ing.id}
                                  className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                                >
                                  {ing.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Acompañantes seleccionados (solo lectura en edición) */}

                        {/* Acompañantes seleccionados (solo lectura en edición) */}
                        {item.customizations?.selected_accompaniments && item.customizations.selected_accompaniments.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Acompañantes seleccionados:</label>
                            <div className="flex flex-wrap gap-2">
                              {item.customizations.selected_accompaniments.map(acc => (
                                <span
                                  key={acc.id}
                                  className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                                >
                                  {acc.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            onClick={() => setEditingItemIndex(null)}
                            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo de visualización MEJORADO
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <p className="font-semibold text-lg">{item.quantity}x {item.menu_item_name}</p>
                              <span className="text-sm text-gray-600">@ ${item.price_at_order.toFixed(2)}</span>
                            </div>
                            <p className="text-base font-bold text-green-700 mt-1">
                              Subtotal: ${(item.quantity * item.price_at_order).toFixed(2)}
                            </p>

                            {item.notes && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                <p className="text-sm italic text-gray-700">
                                  📝 <span className="font-medium">Nota:</span> {item.notes}
                                </p>
                              </div>
                            )}

                            {/* CUSTOMIZACIONES - NUEVO FORMATO DEL BACKEND */}
                            {(() => {
                              // El backend ahora devuelve solo lo que SÍ lleva el plato
                              const activeIngredients = item.customizations?.active_ingredients || [];
                              const selectedAccompaniments = item.customizations?.selected_accompaniments || [];
                              const hasCustomizations = activeIngredients.length > 0 || selectedAccompaniments.length > 0;

                              if (!hasCustomizations) {
                                // El plato no tiene ingredientes ni acompañantes
                                return (
                                  <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-xs text-gray-500 italic">
                                      Sin ingredientes ni acompañantes especificados
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="mt-2 space-y-2">
                                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                    📋 Personalización del Plato:
                                  </p>

                                  {/* INGREDIENTES: Mostrar solo los que SÍ lleva */}
                                  {activeIngredients.length > 0 && (
                                    <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-300 shadow-sm">
                                      <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1">
                                        🥬 Ingredientes que lleva:
                                      </p>
                                      <div className="grid grid-cols-1 gap-1">
                                        {activeIngredients.map(ing => (
                                          <div key={ing.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white">
                                            <span className="text-sm font-bold text-green-600">✓</span>
                                            <p className="text-xs font-medium text-green-700">{ing.name}</p>
                                          </div>
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

                                  {/* ACOMPAÑANTES: Mostrar solo los que SÍ lleva */}
                                  {selectedAccompaniments.length > 0 && (
                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-300 shadow-sm">
                                      <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                                        🍽️ Acompañantes seleccionados:
                                      </p>
                                      <div className="grid grid-cols-1 gap-1">
                                        {selectedAccompaniments.map(acc => (
                                          <div key={acc.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white">
                                            <span className="text-sm text-blue-600">✓</span>
                                            <p className="text-xs font-medium text-blue-700">{acc.name}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Si no hay acompañantes */}
                                  {selectedAccompaniments.length === 0 && activeIngredients.length > 0 && (
                                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                      <p className="text-xs text-gray-500 italic">Sin acompañantes seleccionados</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          {editable && (
                            <div className="flex space-x-2 ml-2">
                              <button
                                onClick={() => handleEditItem(index, item)}
                                className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteItem(index)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailModal;