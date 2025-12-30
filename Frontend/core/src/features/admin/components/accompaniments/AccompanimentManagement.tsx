// =================================================================
// ARCHIVO 14: /src/features/admin/components/AccompanimentManagement.tsx (MODERNIZADO)
// =================================================================
import React, { useEffect, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccompaniments, addNewAccompaniment, removeAccompaniment, updateExistingAccompaniment } from './api/accompanimentsSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { Accompaniment } from '../../../../types/accompaniments.ts';
import ExcelImportExportButtons from '../shared/ExcelImportExportButtons.tsx';
import {
  exportAccompanimentsToExcel,
  importAccompanimentsFromExcel,
  downloadAccompanimentTemplate,
  type ImportResult,
  type ImportedAccompaniment
} from '../../../../utils/excelUtils.ts';
import { FaPlus, FaEdit, FaTrash, FaBreadSlice, FaTimes, FaSave } from 'react-icons/fa';

const AccompanimentManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items = [], status = 'idle' } = useSelector((state: RootState) => state.accompaniments) || {};
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [editing, setEditing] = useState<Accompaniment | null>(null);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAccompaniments());
  }, [status, dispatch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editing) {
      if (editing.name.trim()) {
        dispatch(updateExistingAccompaniment(editing));
        setEditing(null);
      }
    } else {
      if (name.trim()) {
        dispatch(addNewAccompaniment({ name: name.trim(), price }));
        setName('');
        setPrice(0);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro?')) dispatch(removeAccompaniment(id));
  };

  // Funciones de Excel
  const handleExport = () => {
    exportAccompanimentsToExcel(items);
  };

  const handleImport = async (file: File): Promise<ImportResult<ImportedAccompaniment>> => {
    return await importAccompanimentsFromExcel(file);
  };

  const handleConfirmImport = async (data: ImportedAccompaniment[]) => {
    try {
      // Crear array de promesas para todas las operaciones
      const promises = data.map(accompanimentData => {
        if (accompanimentData.id) {
          // Actualizar existente - necesita tener id y price definidos
          const fullData: Accompaniment = {
            id: accompanimentData.id,
            name: accompanimentData.name,
            price: accompanimentData.price || 0,
          };
          return dispatch(updateExistingAccompaniment(fullData)).unwrap();
        } else {
          return dispatch(addNewAccompaniment({
            name: accompanimentData.name,
            price: accompanimentData.price || 0
          })).unwrap();
        }
      });

      // Ejecutar todas las operaciones en paralelo
      const results = await Promise.allSettled(promises);

      // Contar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Refrescar lista
      await dispatch(fetchAccompaniments()).unwrap();

      // Log de resultados
      if (failed === 0) {
        console.log(`✅ Importación completada: ${successful} acompañantes guardados`);
      } else {
        console.warn(`⚠️ Importación parcial: ${successful} éxitos, ${failed} fallos`);
      }
    } catch (error) {
      console.error('❌ Error al importar acompañantes:', error);
      throw error;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">🍟 Gestión de Acompañantes</h2>
        <p className="text-gray-600 text-xs sm:text-sm">
          {items.length} {items.length === 1 ? 'acompañante' : 'acompañantes'}
        </p>
      </div>

      {/* Botones de Excel */}
      <ExcelImportExportButtons
        entityType="accompaniments"
        onExport={handleExport}
        onImport={handleImport}
        onConfirmImport={handleConfirmImport}
        onDownloadTemplate={downloadAccompanimentTemplate}
      />

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mb-6 sm:mb-8 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 sm:p-6 rounded-xl border-2 border-amber-200 shadow-md">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex-grow">
            <label htmlFor="accompanimentName" className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              {editing ? '✏️ Editar Acompañante' : '➕ Nuevo Acompañante'}
            </label>
            <input
              id="accompanimentName"
              type="text"
              value={editing ? editing.name : name}
              onChange={(e) => editing ? setEditing({...editing, name: e.target.value}) : setName(e.target.value)}
              placeholder="Ej: Papas Fritas, Arroz, Ensalada..."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base"
              required
            />
          </div>
          <div>
            <label htmlFor="accompanimentPrice" className="block text-sm font-bold text-gray-700 mb-2">
              💰 Precio
            </label>
            <input
              id="accompanimentPrice"
              type="number"
              step="0.01"
              value={editing ? editing.price : price}
              onChange={(e) => editing ? setEditing({...editing, price: parseFloat(e.target.value)}) : setPrice(parseFloat(e.target.value))}
              placeholder="0.00"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 text-sm sm:text-base"
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

      {/* Lista de acompañantes - Grid responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.length > 0 ? (
          items.map(acc => (
            <div
              key={acc.id}
              className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-grow min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaBreadSlice className="text-white text-lg sm:text-xl" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">{acc.name}</h3>
                    <p className="text-green-600 font-bold text-lg sm:text-xl">${acc.price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(acc)}
                    className="p-1.5 sm:p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit className="text-sm sm:text-base" />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 sm:p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <FaTrash className="text-sm sm:text-base" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 sm:py-12">
            <FaBreadSlice className="mx-auto text-gray-300 text-5xl sm:text-6xl mb-3 sm:mb-4" />
            <p className="text-gray-500 font-medium mb-2 sm:mb-4 text-sm sm:text-base">No hay acompañantes registrados</p>
            <p className="text-gray-400 text-xs sm:text-sm">Añade tu primer acompañante usando el formulario arriba</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccompanimentManagement;