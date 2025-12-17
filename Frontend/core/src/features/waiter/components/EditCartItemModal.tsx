// =================================================================
// ARCHIVO: /src/features/waiter/components/EditCartItemModal.tsx
// Modal para editar items del carrito (acompañantes, ingredientes, notas, precio)
// =================================================================
import React, { useState, useMemo } from 'react';
import type { CartItem } from '../../../types/menu';
import type { Accompaniment } from '../../../types/accompaniments';
import type { Ingredient } from '../../../types/ingredients';

interface EditCartItemModalProps {
  item: CartItem;
  onConfirm: (updatedItem: CartItem) => void;
  onClose: () => void;
}

const EditCartItemModal: React.FC<EditCartItemModalProps> = ({ item, onConfirm, onClose }) => {
  const [price, setPrice] = useState(item.price);
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<Accompaniment[]>(item.selectedAccompaniments || []);
  const [removedIngredients, setRemovedIngredients] = useState<Ingredient[]>(item.removedIngredients || []);
  const [notes, setNotes] = useState(item.notes || '');

  const handleAccompanimentToggle = (accompaniment: Accompaniment) => {
    setSelectedAccompaniments(prev =>
      prev.find(a => a.id === accompaniment.id)
        ? prev.filter(a => a.id !== accompaniment.id)
        : [...prev, accompaniment]
    );
  };

  const handleIngredientToggle = (ingredient: Ingredient) => {
    setRemovedIngredients(prev =>
      prev.find(i => i.id === ingredient.id)
        ? prev.filter(i => i.id !== ingredient.id)
        : [...prev, ingredient]
    );
  };

  const finalPrice = useMemo(() => {
    const includedAccompanimentIds = item.accompaniments?.map(a => a.id) || [];
    const extraCost = selectedAccompaniments
      .filter(a => !includedAccompanimentIds.includes(a.id))
      .reduce((sum, acc) => sum + acc.price, 0);
    return price + extraCost;
  }, [item, selectedAccompaniments, price]);

  const handleConfirmClick = () => {
    const updatedItem: CartItem = {
      ...item,
      price,
      finalPrice,
      selectedAccompaniments,
      removedIngredients,
      notes
    };
    onConfirm(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Editar: {item.name}</h2>

        <div className="space-y-4">
          {/* Precio */}
          <div>
            <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700">Precio Base del Ítem</label>
            <input
              type="number"
              id="edit-price"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Ingredientes */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Ingredientes:</h3>
              <p className="text-xs text-gray-500 mb-2">Click para quitar/agregar ingredientes</p>
              <div className="flex flex-wrap gap-2">
                {item.ingredients.map(ing => {
                  const isRemoved = removedIngredients.find(i => i.id === ing.id);
                  return (
                    <button
                      key={ing.id}
                      onClick={() => handleIngredientToggle(ing)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        isRemoved 
                          ? 'bg-red-200 text-red-800 line-through' 
                          : 'bg-green-200 text-green-800'
                      }`}
                    >
                      {ing.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acompañantes */}
          {item.accompaniments && item.accompaniments.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Acompañantes:</h3>
              <p className="text-xs text-gray-500 mb-2">Click para seleccionar/deseleccionar acompañantes</p>
              <div className="flex flex-wrap gap-2">
                {item.accompaniments.map(acc => {
                  const isSelected = selectedAccompaniments.find(a => a.id === acc.id);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => handleAccompanimentToggle(acc)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        isSelected 
                          ? 'bg-blue-200 text-blue-800' 
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {acc.name} {acc.price > 0 && `(+$${acc.price.toFixed(2)})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">Notas Adicionales</label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Ej: Sin cebolla, término medio..."
            />
          </div>
        </div>

        {/* Footer con precio y botones */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-700">Precio total del ítem:</span>
            <span className="text-2xl font-bold text-green-600">${finalPrice.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCartItemModal;

