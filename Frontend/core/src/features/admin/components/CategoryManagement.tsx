// =================================================================
// ARCHIVO 12: /src/features/admin/components/CategoryManagement.tsx
// =================================================================
import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, addNewCategory, removeCategory, updateExistingCategory } from '../../categories/categoriesSlice';
import type { AppDispatch, RootState } from '../../../app/store';
import type { Category } from '../../../types/categories';

const CategoryManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items = [], status = 'idle' } = useSelector((state: RootState) => state.categories) || {};
  const [name, setName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchCategories());
  }, [status, dispatch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      if (editingCategory.name.trim()) {
        dispatch(updateExistingCategory(editingCategory));
        setEditingCategory(null);
      }
    } else {
      if (name.trim()) {
        dispatch(addNewCategory(name.trim()));
        setName('');
      }
    }
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro que quieres eliminar esta categoría?')) {
        dispatch(removeCategory(id));
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Gestionar Categorías</h3>
      <form onSubmit={handleSubmit} className="flex gap-4 mb-4">
        <input 
            type="text" 
            value={editingCategory ? editingCategory.name : name} 
            onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, name: e.target.value}) : setName(e.target.value)}
            placeholder="Nombre de la categoría" 
            className="px-3 py-2 border rounded-lg flex-grow" 
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          {editingCategory ? 'Actualizar' : 'Añadir'}
        </button>
        {editingCategory && <button type="button" onClick={handleCancelEdit} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancelar</button>}
      </form>
      <ul className="space-y-2">
        {items.map(cat => (
          <li key={cat.id} className="p-2 bg-gray-100 rounded flex justify-between items-center">
            <span>{cat.name}</span>
            <div className="space-x-2">
              <button onClick={() => handleEdit(cat)} className="text-blue-500 hover:text-blue-700">Editar</button>
              <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryManagement;