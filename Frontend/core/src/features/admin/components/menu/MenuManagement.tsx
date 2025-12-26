// =================================================================
// ARCHIVO 2: /src/features/admin/components/MenuManagement.tsx (MODERNIZADO + UX MÓVIL)
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
import { FaPlus, FaEdit, FaTrash, FaImage, FaSearch, FaTh, FaList } from 'react-icons/fa';
import { useIsDesktop } from '../../../../hooks/useMediaQuery';

const MenuManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items = [], status = 'idle' } = useSelector((state: RootState) => state.menu) || {};
  const { items: categories = [] } = useSelector((state: RootState) => state.categories) || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const isDesktop = useIsDesktop();

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
    try {
      // Crear array de promesas para todas las operaciones
      const promises = data.map(itemData => {
        if (itemData.id) {
          // Actualizar existente
          return dispatch(updateExistingMenuItem({ id: itemData.id, itemData })).unwrap();
        } else {
          // Crear nuevo
          return dispatch(addNewMenuItem(itemData)).unwrap();
        }
      });

      // Ejecutar todas las operaciones en paralelo y esperar resultados
      const results = await Promise.allSettled(promises);

      // Contar éxitos y fallos
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Refrescar lista después de todas las operaciones
      await dispatch(fetchMenu()).unwrap();

      // Mostrar resultado
      if (failed === 0) {
        console.log(`✅ Importación completada: ${successful} items guardados correctamente`);
      } else {
        console.warn(`⚠️ Importación parcial: ${successful} éxitos, ${failed} fallos`);
        // Mostrar detalles de errores
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Error en item ${index + 1}:`, result.reason);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error al importar items del menú:', error);
      throw error; // Re-lanzar para que ExcelImportExportButtons lo maneje
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Sin categoría';
  };

  // Filtrar items por búsqueda
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(item.category_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header con título y botón añadir - Mejorado para móviles */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">🍽️ Gestión de Menú</h2>
            <p className="text-gray-600 text-xs sm:text-sm">
              {filteredItems.length} {filteredItems.length === 1 ? 'ítem' : 'ítems'} {searchTerm && 'encontrados'}
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <FaPlus className="text-base sm:text-lg" />
            <span className="text-sm sm:text-base">Añadir Ítem</span>
          </button>
        </div>

        {/* Barra de búsqueda y controles */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-grow">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm sm:text-base"
            />
          </div>

          {/* Toggle vista - Solo desktop */}
          {isDesktop && (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FaTh />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FaList />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Botones de Excel */}
      <ExcelImportExportButtons
        entityType="menu"
        onExport={handleExport}
        onImport={handleImport}
        onConfirmImport={handleConfirmImport}
        onDownloadTemplate={downloadMenuTemplate}
      />

      {/* Vista adaptable según dispositivo */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8 sm:p-12 text-center">
          <FaImage className="text-gray-300 text-5xl sm:text-6xl mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-base sm:text-lg mb-2">
            {searchTerm ? 'No se encontraron resultados' : 'No hay items en el menú'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
            >
              Añadir Primer Ítem
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vista Móvil: Cards */}
          {!isDesktop && (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200">
                  <div className="flex gap-3 p-3 sm:p-4">
                    {/* Imagen */}
                    <div className="flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FaImage className="text-gray-400 text-2xl" />
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1 truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {getCategoryName(item.category_id)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.ingredients?.length || 0} ing.
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {item.accompaniments?.length || 0} acomp.
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-xl font-bold text-green-600">
                          ${item.price.toFixed(2)}
                        </span>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vista Desktop: Tabla o Grid */}
          {isDesktop && viewMode === 'table' && (
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
                  {filteredItems.map(item => (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vista Desktop: Grid */}
          {isDesktop && viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200">
                  {/* Imagen destacada */}
                  <div className="relative h-40 bg-gray-200">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaImage className="text-gray-400 text-4xl" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white shadow-lg">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 min-h-[40px]">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {getCategoryName(item.category_id)}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.ingredients?.length || 0} ing.
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {item.accompaniments?.length || 0} acomp.
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors shadow-sm font-medium"
                      >
                        <FaEdit />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors shadow-sm font-medium"
                      >
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && <MenuItemModal item={editingItem} onClose={handleCloseModal} />}
    </div>
  );
};

export default MenuManagement;