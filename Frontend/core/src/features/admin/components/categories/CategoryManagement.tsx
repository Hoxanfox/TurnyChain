// =================================================================
// ARCHIVO 12: /src/features/admin/components/CategoryManagement.tsx (MODERNIZADO)
// =================================================================
import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories, addNewCategory, removeCategory, updateExistingCategory } from './api/categoriesSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { Category } from '../../../../types/categories.ts';
import type { Station } from '../../../../types/stations.ts';
import { stationsAPI } from '../stations/api/stationsAPI';
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
  const [stationId, setStationId] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchCategories());
    loadStations();
  }, [status, dispatch]);

  const loadStations = async () => {
    try {
      const data = await stationsAPI.getActive();
      setStations(data);
    } catch (error) {
      console.error('Error al cargar estaciones:', error);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      if (editingCategory.name.trim()) {
        dispatch(updateExistingCategory(editingCategory));
        setEditingCategory(null);
        setStationId('');
      }
    } else {
      if (name.trim()) {
        const categoryData: any = { name: name.trim() };
        if (stationId) {
          categoryData.station_id = stationId;
        }
        dispatch(addNewCategory(categoryData));
        setName('');
        setStationId('');
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
    setStationId(category.station_id || '');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setStationId('');
  };

  // Funciones de Excel
  const handleExport = () => {
    exportCategoriesToExcel(items);
  };

  const handleImport = async (file: File): Promise<ImportResult<ImportedCategory>> => {
    return await importCategoriesFromExcel(file);
  };

  const handleConfirmImport = async (data: ImportedCategory[]) => {
    try {
      // Crear array de promesas para todas las operaciones
      const promises = data.map(categoryData => {
        if (categoryData.id) {
          // Actualizar existente - convertir a Category completo
          const fullData: Category = {
            id: categoryData.id,
            name: categoryData.name,
          };
          return dispatch(updateExistingCategory(fullData)).unwrap();
        } else {
          return dispatch(addNewCategory(categoryData.name)).unwrap();
        }
      });

      // Ejecutar todas las operaciones en paralelo
      const results = await Promise.allSettled(promises);

      // Contar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Refrescar lista
      await dispatch(fetchCategories()).unwrap();

      // Log de resultados
      if (failed === 0) {
        console.log(`✅ Importación completada: ${successful} categorías guardadas`);
      } else {
        console.warn(`⚠️ Importación parcial: ${successful} éxitos, ${failed} fallos`);
      }
    } catch (error) {
      console.error('❌ Error al importar categorías:', error);
      throw error;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">🏷️ Gestión de Categorías</h2>
        <p className="text-gray-600 text-xs sm:text-sm">
          {items.length} {items.length === 1 ? 'categoría' : 'categorías'}
        </p>
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
      <form onSubmit={handleSubmit} className="mb-6 sm:mb-8 bg-gradient-to-r from-orange-50 to-orange-100 p-4 sm:p-6 rounded-xl border-2 border-orange-200 shadow-md">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex-grow">
            <label htmlFor="categoryName" className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              {editingCategory ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
            </label>
            <input
              id="categoryName"
              type="text"
              value={editingCategory ? editingCategory.name : name}
              onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, name: e.target.value}) : setName(e.target.value)}
              placeholder="Ej: Bebidas, Platos Fuertes, Postres..."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
              required
            />
          </div>
          <div className="flex-grow">
            <label htmlFor="stationSelect" className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              🍳 Estación de Preparación (Opcional)
            </label>
            <select
              id="stationSelect"
              value={editingCategory ? editingCategory.station_id || '' : stationId}
              onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, station_id: e.target.value || undefined}) : setStationId(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
            >
              <option value="">Sin estación asignada</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Los items de esta categoría se prepararán en la estación seleccionada</p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm sm:text-base"
            >
              {editingCategory ? (
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
            {editingCategory && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
              >
                <FaTimes />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Lista de categorías - Grid responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.length > 0 ? (
          items.map(cat => (
            <div
              key={cat.id}
              className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-grow min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaTags className="text-white text-lg sm:text-xl" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">{cat.name}</h3>
                    <p className="text-xs text-gray-500 font-mono truncate">{cat.id}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="p-1.5 sm:p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit className="text-sm sm:text-base" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 sm:p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <FaTrash className="text-sm sm:text-base" />
                  </button>
                </div>
              </div>
              {cat.station_name && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    🍳 <span className="font-semibold">Estación:</span> {cat.station_name}
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 sm:py-12">
            <FaTags className="mx-auto text-gray-300 text-5xl sm:text-6xl mb-3 sm:mb-4" />
            <p className="text-gray-500 font-medium mb-2 sm:mb-4 text-sm sm:text-base">No hay categorías registradas</p>
            <p className="text-gray-400 text-xs sm:text-sm">Añade tu primera categoría usando el formulario arriba</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;