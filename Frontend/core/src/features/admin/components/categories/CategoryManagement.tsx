// =================================================================
// ARCHIVO 12: /src/features/admin/components/CategoryManagement.tsx (MODERNIZADO)
// =================================================================
import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, addNewCategory, removeCategory, updateExistingCategory } from './api/categoriesSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { Category } from '../../../../types/categories.ts';
import ExcelImportExportButtons from '../shared/ExcelImportExportButtons.tsx';
import {
  exportCategoriesToExcel,
  importCategoriesFromExcel,
  downloadCategoryTemplate,
  type ImportResult,
  type ImportedCategory
} from '../../../../utils/excelUtils.ts';
import { FaPlus, FaEdit, FaTrash, FaTags, FaTimes, FaSave } from 'react-icons/fa';

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

  // Funciones de Excel
  const handleExport = () => {
    exportCategoriesToExcel(items);
  };

  const handleImport = async (file: File): Promise<ImportResult<ImportedCategory>> => {
    return await importCategoriesFromExcel(file);
  };

  const handleConfirmImport = async (data: ImportedCategory[]) => {
    for (const categoryData of data) {
      if (categoryData.id) {
        // Actualizar existente - convertir a Category completo
        const fullData: Category = {
          id: categoryData.id,
          name: categoryData.name,
        };
        await dispatch(updateExistingCategory(fullData));
      } else {
        await dispatch(addNewCategory(categoryData.name));
      }
    }
    dispatch(fetchCategories());
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Gestión de Categorías</h2>
        <p className="text-gray-600 text-sm">Administra las categorías del menú</p>
      </div>

      {/* Botones de Excel */}
      <ExcelImportExportButtons
        entityType="categories"
        onExport={handleExport}
        onImport={handleImport}
        onConfirmImport={handleConfirmImport}
        onDownloadTemplate={downloadCategoryTemplate}
      />

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </label>
            <input
              id="categoryName"
              type="text"
              value={editingCategory ? editingCategory.name : name}
              onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, name: e.target.value}) : setName(e.target.value)}
              placeholder="Nombre de la categoría"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div className="flex gap-2 sm:items-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              {editingCategory ? (
                <>
                  <FaSave className="text-lg" />
                  <span>Actualizar</span>
                </>
              ) : (
                <>
                  <FaPlus className="text-lg" />
                  <span>Añadir</span>
                </>
              )}
            </button>
            {editingCategory && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FaTimes />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Lista de categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length > 0 ? (
          items.map(cat => (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-grow">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaTags className="text-white text-xl" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="font-bold text-gray-900 text-lg truncate">{cat.name}</h3>
                    <p className="text-xs text-gray-500 font-mono truncate">{cat.id}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FaTags className="mx-auto text-gray-300 text-6xl mb-4" />
            <p className="text-gray-500 font-medium mb-4">No hay categorías registradas</p>
            <p className="text-gray-400 text-sm">Añade tu primera categoría usando el formulario arriba</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;