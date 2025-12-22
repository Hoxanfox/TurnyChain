// =================================================================
// ARCHIVO 13: /src/features/admin/components/IngredientManagement.tsx (MODERNIZADO)
// =================================================================
import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchIngredients, addNewIngredient, removeIngredient, updateExistingIngredient } from './api/ingredientsSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { Ingredient } from '../../../../types/ingredients.ts';
import ExcelImportExportButtons from '../shared/ExcelImportExportButtons.tsx';
import {
  exportIngredientsToExcel,
  importIngredientsFromExcel,
  downloadIngredientTemplate,
  type ImportResult,
  type ImportedIngredient
} from '../../../../utils/excelUtils.ts';
import { FaPlus, FaEdit, FaTrash, FaLeaf, FaTimes, FaSave } from 'react-icons/fa';

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

  // Funciones de Excel
  const handleExport = () => {
    exportIngredientsToExcel(items);
  };

  const handleImport = async (file: File): Promise<ImportResult<ImportedIngredient>> => {
    return await importIngredientsFromExcel(file);
  };

  const handleConfirmImport = async (data: ImportedIngredient[]) => {
    for (const ingredientData of data) {
      if (ingredientData.id) {
        // Actualizar existente - convertir a Ingredient completo
        const fullData: Ingredient = {
          id: ingredientData.id,
          name: ingredientData.name,
        };
        await dispatch(updateExistingIngredient(fullData));
      } else {
        await dispatch(addNewIngredient(ingredientData.name));
      }
    }
    dispatch(fetchIngredients());
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Gestión de Ingredientes</h2>
        <p className="text-gray-600 text-sm">Administra los ingredientes disponibles</p>
      </div>

      {/* Botones de Excel */}
      <ExcelImportExportButtons
        entityType="ingredients"
        onExport={handleExport}
        onImport={handleImport}
        onConfirmImport={handleConfirmImport}
        onDownloadTemplate={downloadIngredientTemplate}
      />

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gradient-to-r from-green-50 to-lime-50 p-6 rounded-xl border border-green-200 shadow-md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="ingredientName" className="block text-sm font-medium text-gray-700 mb-2">
              {editing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
            </label>
            <input
              id="ingredientName"
              type="text"
              value={editing ? editing.name : name}
              onChange={(e) => editing ? setEditing({...editing, name: e.target.value}) : setName(e.target.value)}
              placeholder="Nombre del ingrediente"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div className="flex gap-2 sm:items-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-lime-600 hover:from-green-600 hover:to-lime-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              {editing ? (
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
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FaTimes />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Lista de ingredientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.length > 0 ? (
          items.map(ing => (
            <div
              key={ing.id}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-grow min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-lime-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaLeaf className="text-white" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="font-semibold text-gray-900 truncate">{ing.name}</h3>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(ing)}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit className="text-sm" />
                  </button>
                  <button
                    onClick={() => handleDelete(ing.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FaLeaf className="mx-auto text-gray-300 text-6xl mb-4" />
            <p className="text-gray-500 font-medium mb-4">No hay ingredientes registrados</p>
            <p className="text-gray-400 text-sm">Añade tu primer ingrediente usando el formulario arriba</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngredientManagement;