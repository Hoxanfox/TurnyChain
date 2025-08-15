// =================================================================
// ARCHIVO 2: /src/features/waiter/components/CustomizeOrderItemModal.tsx (ACTUALIZADO)
// =================================================================
import React, { useState, useMemo } from 'react';
import type { MenuItem } from '../../../types/menu'; // CORRECCIÓN: Se elimina la importación de CartItem
import type { Accompaniment } from '../../../types/accompaniments';
import type { Ingredient } from '../../../types/ingredients';

// Se define un tipo claro para los datos que devuelve el modal.
interface CustomizationData {
    price: number;
    finalPrice: number;
    selectedAccompaniments: Accompaniment[];
    removedIngredients: Ingredient[];
    notes: string;
}

interface CustomizeOrderItemModalProps {
  item: MenuItem;
  onConfirm: (customizationData: CustomizationData) => void;
  onClose: () => void;
}

const CustomizeOrderItemModal: React.FC<CustomizeOrderItemModalProps> = ({ item, onConfirm, onClose }) => {
  const [price, setPrice] = useState(item.price);
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<Accompaniment[]>(item.accompaniments || []);
  const [removedIngredients, setRemovedIngredients] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState('');

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
    onConfirm({
        price,
        finalPrice,
        selectedAccompaniments,
        removedIngredients,
        notes
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Personalizar: {item.name}</h2>
        
        <div className="space-y-4">
            <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Precio Base del Ítem</label>
                <input type="number" id="price" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="mt-1 block w-full px-3 py-2 border rounded-md"/>
            </div>
            <div>
                <h3 className="font-semibold text-sm text-gray-700">Ingredientes:</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                    {(item.ingredients || []).map(ing => (
                    <button key={ing.id} onClick={() => handleIngredientToggle(ing)}
                        className={`px-3 py-1 rounded-full text-sm ${!removedIngredients.find(i => i.id === ing.id) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800 line-through'}`}>
                        {ing.name}
                    </button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="font-semibold text-sm text-gray-700">Acompañantes:</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                    {(item.accompaniments || []).map(acc => (
                    <button key={acc.id} onClick={() => handleAccompanimentToggle(acc)}
                        className={`px-3 py-1 rounded-full text-sm ${selectedAccompaniments.find(a => a.id === acc.id) ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                        {acc.name}
                    </button>
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas Adicionales</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <span className="text-xl font-bold">Total del Ítem: ${finalPrice.toFixed(2)}</span>
          <div>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 mr-2">Cancelar</button>
            <button type="button" onClick={handleConfirmClick} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Añadir a la Orden</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizeOrderItemModal;