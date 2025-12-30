// =================================================================
// ARCHIVO 4: /src/features/admin/components/MenuItemModal.tsx (COMPLETO Y FUNCIONAL)
// =================================================================
import React, { useState, useEffect, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNewMenuItem, updateExistingMenuItem } from '../api/menuSlice.ts';
import { fetchCategories } from '../../categories/api/categoriesSlice.ts';
import { fetchIngredients } from '../../ingredients/api/ingredientsSlice.ts';
import { fetchAccompaniments } from '../../accompaniments/api/accompanimentsSlice.ts';
import type { AppDispatch, RootState } from '../../../../../app/store.ts';
import type { MenuItem } from '../../../../../types/menu.ts';
import type { MenuItemPayload } from '../api/menuAPI.ts';

interface MenuItemModalProps {
  item?: MenuItem | null;
  onClose: () => void;
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({ item, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories } = useSelector((state: RootState) => state.categories);
  const { items: ingredients } = useSelector((state: RootState) => state.ingredients);
  const { items: accompaniments } = useSelector((state: RootState) => state.accompaniments);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchIngredients());
    dispatch(fetchAccompaniments());
  }, [dispatch]);

  // 🔧 FIX: Actualizar estados cuando cambia el item
  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description);
      setPrice(item.price);
      setCategoryId(item.category_id);
      setSelectedIngredients(item.ingredients?.map(i => i.id) || []);
      setSelectedAccompaniments(item.accompaniments?.map(a => a.id) || []);
    } else {
      setName('');
      setDescription('');
      setPrice(0);
      setCategoryId('');
      setSelectedIngredients([]);
      setSelectedAccompaniments([]);
    }
  }, [item]);

  const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(id => id !== value) : [...prev, value]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
        alert("Por favor, seleccione una categoría.");
        return;
    }
    const itemData: MenuItemPayload = { 
        name, description, price, category_id: categoryId, 
        ingredient_ids: selectedIngredients, 
        accompaniment_ids: selectedAccompaniments 
    };
    if (item) {
      dispatch(updateExistingMenuItem({ id: item.id, itemData }));
    } else {
      dispatch(addNewMenuItem(itemData));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl z-10">
          <h2 className="text-lg sm:text-xl font-bold">
            {item ? '✏️ Editar Ítem' : '➕ Crear Nuevo Ítem'}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1">
            {item ? 'Modifica los campos que desees actualizar' : 'Completa la información del nuevo ítem'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Campos básicos */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                📝 Nombre del Ítem *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm sm:text-base"
                placeholder="Ej: Hamburguesa Clásica"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">
                📄 Descripción
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm sm:text-base"
                rows={3}
                placeholder="Describe el ítem..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-bold text-gray-700 mb-2">
                  💰 Precio *
                </label>
                <input
                  type="number"
                  id="price"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm sm:text-base"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-bold text-gray-700 mb-2">
                  🏷️ Categoría *
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm sm:text-base"
                  required
                >
                  <option value="" disabled>Seleccione...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Selectores mejorados con diseño de chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border-2 border-blue-200">
              <label className="block text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                🥬 Ingredientes
                <span className="text-xs font-normal bg-blue-200 px-2 py-0.5 rounded-full">
                  {selectedIngredients.length} seleccionados
                </span>
              </label>
              <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2">
                {ingredients.length === 0 ? (
                  <p className="text-xs text-blue-600 italic">No hay ingredientes disponibles</p>
                ) : (
                  ingredients.map(ing => (
                    <label
                      key={ing.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        id={`ing-${ing.id}`}
                        checked={selectedIngredients.includes(ing.id)}
                        onChange={() => handleMultiSelect(setSelectedIngredients, ing.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">{ing.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 sm:p-4 border-2 border-amber-200">
              <label className="block text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                🍟 Acompañantes
                <span className="text-xs font-normal bg-amber-200 px-2 py-0.5 rounded-full">
                  {selectedAccompaniments.length} incluidos
                </span>
              </label>
              <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2">
                {accompaniments.length === 0 ? (
                  <p className="text-xs text-amber-600 italic">No hay acompañantes disponibles</p>
                ) : (
                  accompaniments.map(acc => (
                    <label
                      key={acc.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        id={`acc-${acc.id}`}
                        checked={selectedAccompaniments.includes(acc.id)}
                        onChange={() => handleMultiSelect(setSelectedAccompaniments, acc.id)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-xs sm:text-sm text-gray-700">{acc.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción - Sticky bottom en móvil */}
          <div className="sticky bottom-0 bg-white pt-4 pb-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t-2 border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors text-sm sm:text-base"
            >
              ❌ Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-bold shadow-lg transition-all text-sm sm:text-base"
            >
              {item ? '💾 Actualizar' : '✨ Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemModal;
