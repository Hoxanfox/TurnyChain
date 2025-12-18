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

  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price || 0);
  const [categoryId, setCategoryId] = useState(item?.category_id || '');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(item?.ingredients?.map(i => i.id) || []);
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<string[]>(item?.accompaniments?.map(a => a.id) || []);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchIngredients());
    dispatch(fetchAccompaniments());
  }, [dispatch]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">{item ? 'Editar Ítem' : 'Crear Nuevo Ítem'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campos de texto y categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">Precio</label>
              <input type="number" id="price" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" required>
                <option value="" disabled>Seleccione una categoría</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          
          {/* Selectores de Ingredientes y Acompañantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ingredientes</label>
              <div className="mt-2 border rounded-md p-2 h-32 overflow-y-auto">
                {ingredients.map(ing => (
                  <div key={ing.id} className="flex items-center">
                    <input type="checkbox" id={`ing-${ing.id}`} checked={selectedIngredients.includes(ing.id)} onChange={() => handleMultiSelect(setSelectedIngredients, ing.id)} className="mr-2"/>
                    <label htmlFor={`ing-${ing.id}`}>{ing.name}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Acompañantes Incluidos</label>
              <div className="mt-2 border rounded-md p-2 h-32 overflow-y-auto">
                {accompaniments.map(acc => (
                  <div key={acc.id} className="flex items-center">
                    <input type="checkbox" id={`acc-${acc.id}`} checked={selectedAccompaniments.includes(acc.id)} onChange={() => handleMultiSelect(setSelectedAccompaniments, acc.id)} className="mr-2"/>
                    <label htmlFor={`acc-${acc.id}`}>{acc.name}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemModal;
