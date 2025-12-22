// =================================================================
// ARCHIVO 2: /src/features/admin/components/MenuManagement.tsx (MODERNIZADO)
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenu, softDeleteMenuItem, addNewMenuItem, updateExistingMenuItem } from './api/menuSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { MenuItem } from '../../../../types/menu.ts';
import MenuItemModal from './components/MenuItemModal.tsx';
import ExcelImportExportButtons from '../shared/ExcelImportExportButtons.tsx';
import {
  exportMenuToExcel,
  importMenuFromExcel,
  downloadMenuTemplate,
  type ImportResult,
  type ImportedMenuItem
} from '../../../../utils/excelUtils.ts';
import { FaPlus, FaEdit, FaTrash, FaImage } from 'react-icons/fa';

const MenuManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items = [], status = 'idle' } = useSelector((state: RootState) => state.menu) || {};
  const { items: categories = [] } = useSelector((state: RootState) => state.categories) || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMenu());
    }
  }, [status, dispatch]);

  const handleOpenModal = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };
  
  const handleDelete = (itemId: string) => {
    if (window.confirm('¿Estás seguro de que quieres desactivar este ítem?')) {
        dispatch(softDeleteMenuItem(itemId));
    }
  };

  // Funciones de Excel
  const handleExport = () => {
    exportMenuToExcel(items);
  };

  const handleImport = async (file: File): Promise<ImportResult<ImportedMenuItem>> => {
    return await importMenuFromExcel(file);
  };

  const handleConfirmImport = async (data: ImportedMenuItem[]) => {
    // Importar cada item
    for (const itemData of data) {
      if (itemData.id) {
        // Actualizar existente
        await dispatch(updateExistingMenuItem({ id: itemData.id, itemData }));
      } else {
        // Crear nuevo
        await dispatch(addNewMenuItem(itemData));
      }
    }
    // Refrescar lista
    dispatch(fetchMenu());
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Sin categoría';
  };

  return (
    <div>
      {/* Header con título y botón añadir */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Gestión de Menú</h2>
          <p className="text-gray-600 text-sm">Administra los items del menú del restaurante</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <FaPlus className="text-lg" />
          <span>Añadir Ítem</span>
        </button>
      </div>

      {/* Botones de Excel */}
      <ExcelImportExportButtons
        entityType="menu"
        onExport={handleExport}
        onImport={handleImport}
        onConfirmImport={handleConfirmImport}
        onDownloadTemplate={downloadMenuTemplate}
      />

      {/* Tabla de items */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
        <table className="min-w-full bg-white">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Ingredientes
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Acompañantes
              </th>
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.isArray(items) && items.length > 0 ? (
              items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FaImage className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {getCategoryName(item.category_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-bold text-green-600">
                      ${item.price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.ingredients?.length || 0} items
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {item.accompaniments?.length || 0} items
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors duration-150 shadow-sm"
                      >
                        <FaEdit />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors duration-150 shadow-sm"
                      >
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FaImage className="text-gray-300 text-5xl" />
                    <p className="text-gray-500 font-medium">No hay items en el menú</p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      Añadir Primer Ítem
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && <MenuItemModal item={editingItem} onClose={handleCloseModal} />}
    </div>
  );
};

export default MenuManagement;