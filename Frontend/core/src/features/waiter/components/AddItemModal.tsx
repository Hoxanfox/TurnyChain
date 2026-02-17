// =================================================================
// ARCHIVO: /src/features/waiter/components/AddItemModal.tsx
// Modal para agregar items con customizaciones completas a una orden
// =================================================================
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import type { OrderItemPayload } from '../../../types/orders';
import type { MenuItem } from '../../../types/menu';
import type { Ingredient } from '../../../types/ingredients';
import type { Accompaniment } from '../../../types/accompaniments';

interface AddItemModalProps {
  onClose: () => void;
  onConfirm: (newItem: OrderItemPayload & { menu_item_name: string }) => void;
  orderType?: string; // "mesa" | "llevar" | "domicilio"
}

const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onConfirm, orderType }) => {
  const menuItems = useSelector((state: RootState) => state.menu.items);

  // Estado del formulario
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isTakeout, setIsTakeout] = useState(false);

  // Ingredientes y acompañantes
  const [removedIngredientIds, setRemovedIngredientIds] = useState<string[]>([]);
  const [unselectedAccompanimentIds, setUnselectedAccompanimentIds] = useState<string[]>([]);

  // Actualizar item seleccionado cuando cambia la selección
  useEffect(() => {
    if (selectedMenuItemId) {
      const item = menuItems.find((item: MenuItem) => item.id === selectedMenuItemId);
      setSelectedMenuItem(item || null);
      // Reset customizations cuando se selecciona un nuevo item
      setRemovedIngredientIds([]);
      setUnselectedAccompanimentIds([]);
      setQuantity(1);
      setNotes('');
      // Auto-set is_takeout si el orderType lo requiere
      setIsTakeout(orderType === 'llevar' || orderType === 'domicilio');
    } else {
      setSelectedMenuItem(null);
    }
  }, [selectedMenuItemId, menuItems, orderType]);

  // Toggle ingrediente
  const toggleIngredient = (ingredientId: string) => {
    setRemovedIngredientIds((prev: string[]) =>
      prev.includes(ingredientId)
        ? prev.filter((id: string) => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  // Toggle acompañante
  const toggleAccompaniment = (accompanimentId: string) => {
    setUnselectedAccompanimentIds((prev: string[]) =>
      prev.includes(accompanimentId)
        ? prev.filter((id: string) => id !== accompanimentId)
        : [...prev, accompanimentId]
    );
  };

  // Calcular precio total
  const calculatePrice = () => {
    if (!selectedMenuItem) return 0;
    const basePrice = selectedMenuItem.price;
    const accompanimentsPrice = (selectedMenuItem.accompaniments || [])
      .filter((acc: Accompaniment) => !unselectedAccompanimentIds.includes(acc.id))
      .reduce((sum: number, acc: Accompaniment) => sum + acc.price, 0);
    return basePrice + accompanimentsPrice;
  };

  // Confirmar y agregar item
  const handleConfirm = () => {
    if (!selectedMenuItem) return;

    const pricePerUnit = calculatePrice();

    const newItem: OrderItemPayload & { menu_item_name: string } = {
      menu_item_id: selectedMenuItem.id,
      menu_item_name: selectedMenuItem.name,
      quantity,
      price_at_order: pricePerUnit,
      notes: notes || undefined,
      is_takeout: isTakeout,
      customizations_input: {
        removed_ingredient_ids: removedIngredientIds,
        unselected_accompaniment_ids: unselectedAccompanimentIds,
      },
    };

    onConfirm(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-2xl font-bold">➕ Agregar Item a la Orden</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selector de Plato */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seleccionar Plato *
            </label>
            <select
              value={selectedMenuItemId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMenuItemId(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Selecciona un plato --</option>
              {menuItems.map((item: MenuItem) => (
                <option key={item.id} value={item.id}>
                  {item.name} - ${item.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Detalles del Item Seleccionado */}
          {selectedMenuItem && (
            <>
              {/* Ingredientes */}
              {selectedMenuItem.ingredients && selectedMenuItem.ingredients.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🥕 Ingredientes</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Haz clic para quitar ingredientes que el cliente no desea
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMenuItem.ingredients.map((ingredient: Ingredient) => {
                      const isRemoved = removedIngredientIds.includes(ingredient.id);
                      return (
                        <button
                          key={ingredient.id}
                          onClick={() => toggleIngredient(ingredient.id)}
                          className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                            isRemoved
                              ? 'bg-red-100 text-red-700 line-through border-2 border-red-300'
                              : 'bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200'
                          }`}
                        >
                          {isRemoved ? '❌' : '✅'} {ingredient.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Acompañantes */}
              {selectedMenuItem.accompaniments && selectedMenuItem.accompaniments.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🍟 Acompañantes</h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Haz clic para deseleccionar acompañantes que el cliente no desea
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMenuItem.accompaniments.map((accompaniment: Accompaniment) => {
                      const isUnselected = unselectedAccompanimentIds.includes(accompaniment.id);
                      return (
                        <button
                          key={accompaniment.id}
                          onClick={() => toggleAccompaniment(accompaniment.id)}
                          className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                            isUnselected
                              ? 'bg-red-100 text-red-700 line-through border-2 border-red-300'
                              : 'bg-blue-100 text-blue-700 border-2 border-blue-300 hover:bg-blue-200'
                          }`}
                        >
                          {isUnselected ? '❌' : '✅'} {accompaniment.name} (+${accompaniment.price.toFixed(2)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cantidad
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center border-2 border-gray-300 rounded-lg px-3 py-2 font-semibold text-lg"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas Especiales (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder="Ej: Sin sal, bien cocido, etc."
                  rows={3}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Para Llevar */}
              <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <input
                  type="checkbox"
                  checked={isTakeout}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsTakeout(e.target.checked)}
                  disabled={orderType === 'llevar' || orderType === 'domicilio'}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  📦 Este item es para llevar
                  {(orderType === 'llevar' || orderType === 'domicilio') && (
                    <span className="text-xs text-purple-600 ml-2">(Obligatorio para este tipo de orden)</span>
                  )}
                </label>
              </div>

              {/* Precio Total */}
              <div className="bg-gradient-to-r from-green-100 to-teal-100 border-2 border-green-300 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Precio Unitario:</span>
                  <span className="text-2xl font-bold text-green-700">${calculatePrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-green-300">
                  <span className="text-lg font-semibold text-gray-700">Total ({quantity}x):</span>
                  <span className="text-3xl font-bold text-green-800">${(calculatePrice() * quantity).toFixed(2)}</span>
                </div>
              </div>
            </>
          )}

          {!selectedMenuItem && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">👆 Selecciona un plato del menú para comenzar</p>
            </div>
          )}
        </div>

        {/* Footer - Acciones */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMenuItem}
            className={`px-6 py-2 font-semibold rounded-lg transition ${
              selectedMenuItem
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            ✅ Agregar a la Orden
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
