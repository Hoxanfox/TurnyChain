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
    try {
      // Crear array de promesas para todas las operaciones
      const promises = data.map(ingredientData => {
        if (ingredientData.id) {
          // Actualizar existente - convertir a Ingredient completo
          const fullData: Ingredient = {
            id: ingredientData.id,
            name: ingredientData.name,
          };
          return dispatch(updateExistingIngredient(fullData)).unwrap();
        } else {
          return dispatch(addNewIngredient(ingredientData.name)).unwrap();
        }
      });

      // Ejecutar todas las operaciones en paralelo
      const results = await Promise.allSettled(promises);

      // Contar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Refrescar lista
      await dispatch(fetchIngredients()).unwrap();

      // Log de resultados
      if (failed === 0) {
        console.log(`✅ Importación completada: ${successful} ingredientes guardados`);
      } else {
        console.warn(`⚠️ Importación parcial: ${successful} éxitos, ${failed} fallos`);
      }
    } catch (error) {
      console.error('❌ Error al importar ingredientes:', error);
      throw error;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">🥬 Gestión de Ingredientes</h2>
        <p className="text-gray-600 text-xs sm:text-sm">
          {items.length} {items.length === 1 ? 'ingrediente' : 'ingredientes'}
        </p>
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
      <form onSubmit={handleSubmit} className="mb-6 sm:mb-8 bg-gradient-to-r from-green-50 to-lime-50 p-4 sm:p-6 rounded-xl border-2 border-green-200 shadow-md">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex-grow">
            <label htmlFor="ingredientName" className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              {editing ? '✏️ Editar Ingrediente' : '➕ Nuevo Ingrediente'}
            </label>
            <input
              id="ingredientName"
              type="text"
              value={editing ? editing.name : name}
              onChange={(e) => editing ? setEditing({...editing, name: e.target.value}) : setName(e.target.value)}
              placeholder="Ej: Lechuga, Tomate, Cebolla..."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-lime-600 hover:from-green-600 hover:to-lime-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm sm:text-base"
            >
              {editing ? (
                <>
                  <FaSave className="text-base sm:text-lg" />
                  <span>Actualizar</span>
                </>
              ) : (
                <>
                  <FaPlus className="text-base sm:text-lg" />
                  <span>Añadir</span>
                </>
              )}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
              >
                <FaTimes />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Lista de ingredientes - Grid responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {items.length > 0 ? (
          items.map(ing => (
            <div
              key={ing.id}
              className="bg-white p-3 sm:p-4 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-grow min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-lime-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaLeaf className="text-white text-sm sm:text-base" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{ing.name}</h3>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(ing)}
                    className="p-1.5 sm:p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit className="text-xs sm:text-sm" />
                  </button>
                  <button
                    onClick={() => handleDelete(ing.id)}
                    className="p-1.5 sm:p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <FaTrash className="text-xs sm:text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 sm:py-12">
            <FaLeaf className="mx-auto text-gray-300 text-5xl sm:text-6xl mb-3 sm:mb-4" />
            <p className="text-gray-500 font-medium mb-2 sm:mb-4 text-sm sm:text-base">No hay ingredientes registrados</p>
            <p className="text-gray-400 text-xs sm:text-sm">Añade tu primer ingrediente usando el formulario arriba</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngredientManagement;