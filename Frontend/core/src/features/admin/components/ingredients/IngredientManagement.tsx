// =================================================================
// ARCHIVO 13: /src/features/admin/components/IngredientManagement.tsx
// =================================================================
import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchIngredients, addNewIngredient, removeIngredient, updateExistingIngredient } from './api/ingredientsSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { Ingredient } from '../../../../types/ingredients.ts';

const IngredientManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items = [], status = 'idle' } = useSelector((state: RootState) => state.ingredients) || {};
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Ingredient | null>(null);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchIngredients());
  }, [status, dispatch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) {
      if (editing.name.trim()) {
        dispatch(updateExistingIngredient(editing));
        setEditing(null);
      }
    } else {
      if (name.trim()) {
        dispatch(addNewIngredient(name.trim()));
        setName('');
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro?')) dispatch(removeIngredient(id));
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Gestionar Ingredientes</h3>
      <form onSubmit={handleSubmit} className="flex gap-4 mb-4">
        <input type="text" value={editing ? editing.name : name} 
               onChange={(e) => editing ? setEditing({...editing, name: e.target.value}) : setName(e.target.value)}
               placeholder="Nombre del ingrediente" className="px-3 py-2 border rounded-lg flex-grow" />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          {editing ? 'Actualizar' : 'Añadir'}
        </button>
        {editing && <button type="button" onClick={() => setEditing(null)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancelar</button>}
      </form>
      <ul className="space-y-2">
        {items.map(ing => (
          <li key={ing.id} className="p-2 bg-gray-100 rounded flex justify-between items-center">
            <span>{ing.name}</span>
            <div className="space-x-2">
              <button onClick={() => setEditing(ing)} className="text-blue-500 hover:text-blue-700">Editar</button>
              <button onClick={() => handleDelete(ing.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IngredientManagement;