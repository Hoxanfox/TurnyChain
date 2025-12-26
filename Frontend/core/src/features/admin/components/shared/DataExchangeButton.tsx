// =================================================================
// Componente Flotante para Importación/Exportación Unificada
// =================================================================
import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaFileExcel, FaUpload, FaDownload, FaFileImport, FaTimes, FaCheckCircle } from 'react-icons/fa';
import type { RootState, AppDispatch } from '../../../../app/store';
import {
  exportAllDataToExcel,
  importAllDataFromExcel,
  downloadUnifiedTemplate,
  type UnifiedImportResult
} from '../../../../utils/excelUtils';
// Importar acciones para guardar datos
import { addNewCategory, fetchCategories } from '../categories/api/categoriesSlice';
import { addNewIngredient, fetchIngredients } from '../ingredients/api/ingredientsSlice';
import { addNewAccompaniment, fetchAccompaniments } from '../accompaniments/api/accompanimentsSlice';
import { addNewMenuItem, fetchMenu } from '../menu/api/menuSlice';
import type { Category } from '../../../../types/categories';
import type { Ingredient } from '../../../../types/ingredients';
import type { Accompaniment } from '../../../../types/accompaniments';

const DataExchangeButton: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isOpen, setIsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState<UnifiedImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener todos los datos del store
  const menuItems = useSelector((state: RootState) => state.menu?.items || []);
  const categories = useSelector((state: RootState) => state.categories?.items || []);
  const ingredients = useSelector((state: RootState) => state.ingredients?.items || []);
  const accompaniments = useSelector((state: RootState) => state.accompaniments?.items || []);

  const handleExportAll = () => {
    try {
      exportAllDataToExcel({
        menu: menuItems,
        categories,
        ingredients,
        accompaniments,
      }, `turnychain_backup_${new Date().toISOString().split('T')[0]}.xlsx`);

      alert('✅ Datos exportados exitosamente');
      setIsOpen(false);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('❌ Error al exportar los datos');
    }
  };

  const handleImportAll = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Paso 1: Leer y validar el archivo
      const result = await importAllDataFromExcel(file);
      setImportResult(result);

      if (result.success) {
        console.log('✅ Datos validados correctamente:', result);
      } else {
        console.warn('⚠️ Archivo importado con errores');
      }
    } catch (error) {
      console.error('❌ Error al leer el archivo:', error);
      alert('❌ Error al leer el archivo Excel');
      setImportResult(null);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveImportedData = async () => {
    if (!importResult) return;

    setSaving(true);
    const errors: string[] = [];

    try {
      let totalSuccess = 0;
      let totalFailed = 0;

      // Guardar Categorías - SIEMPRE CREAR NUEVOS
      if (importResult.categories.data.length > 0) {
        console.log('💾 Guardando categorías...', importResult.categories.data);
        const promises = importResult.categories.data.map((cat, index) => {
          // Siempre crear nuevo (ignorar ID del Excel)
          console.log(`  → Creando categoría [${index}]:`, cat.name);
          return dispatch(addNewCategory(cat.name)).unwrap();
        });
        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const error = `Categoría [${index}]: ${result.reason?.message || result.reason}`;
            console.error('❌', error);
            errors.push(error);
          }
        });
        const success = results.filter(r => r.status === 'fulfilled').length;
        totalSuccess += success;
        totalFailed += results.length - success;
        if (success > 0) await dispatch(fetchCategories()).unwrap();
      }

      // Guardar Ingredientes - SIEMPRE CREAR NUEVOS
      if (importResult.ingredients.data.length > 0) {
        console.log('💾 Guardando ingredientes...', importResult.ingredients.data);
        const promises = importResult.ingredients.data.map((ing, index) => {
          // Siempre crear nuevo (ignorar ID del Excel)
          console.log(`  → Creando ingrediente [${index}]:`, ing.name);
          return dispatch(addNewIngredient(ing.name)).unwrap();
        });
        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const error = `Ingrediente [${index}]: ${result.reason?.message || result.reason}`;
            console.error('❌', error);
            errors.push(error);
          }
        });
        const success = results.filter(r => r.status === 'fulfilled').length;
        totalSuccess += success;
        totalFailed += results.length - success;
        if (success > 0) await dispatch(fetchIngredients()).unwrap();
      }

      // Guardar Acompañantes - SIEMPRE CREAR NUEVOS
      if (importResult.accompaniments.data.length > 0) {
        console.log('💾 Guardando acompañantes...', importResult.accompaniments.data);
        const promises = importResult.accompaniments.data.map((acc, index) => {
          // Siempre crear nuevo (ignorar ID del Excel)
          console.log(`  → Creando acompañante [${index}]:`, { name: acc.name, price: acc.price || 0 });
          return dispatch(addNewAccompaniment({ name: acc.name, price: acc.price || 0 })).unwrap();
        });
        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const error = `Acompañante [${index}]: ${result.reason?.message || result.reason}`;
            console.error('❌', error);
            errors.push(error);
          }
        });
        const success = results.filter(r => r.status === 'fulfilled').length;
        totalSuccess += success;
        totalFailed += results.length - success;
        if (success > 0) await dispatch(fetchAccompaniments()).unwrap();
      }

      // Guardar Items del Menú
      if (importResult.menu.data.length > 0) {
        console.log('💾 Guardando items del menú...', importResult.menu.data);

        // Refrescar datos para obtener los nuevos IDs generados
        await dispatch(fetchCategories()).unwrap();
        await dispatch(fetchIngredients()).unwrap();
        await dispatch(fetchAccompaniments()).unwrap();

        // Obtener datos actuales desde las props del componente (ya vienen del useSelector)
        const currentCategories: Category[] = categories;
        const currentIngredients: Ingredient[] = ingredients;
        const currentAccompaniments: Accompaniment[] = accompaniments;

        console.log('  📋 IDs actuales disponibles:', {
          categories: currentCategories.length,
          ingredients: currentIngredients.length,
          accompaniments: currentAccompaniments.length
        });

        const promises = importResult.menu.data.map((item, index) => {
          // Crear copia sin ID
          const itemData = { ...item };
          delete itemData.id; // Eliminar ID del Excel

          // Mapear category_id por nombre (ya que los IDs cambiaron)
          const categoryName = importResult.categories.data.find(c => c.id === item.category_id)?.name;
          const newCategory = currentCategories.find((c: Category) => c.name === categoryName);
          if (newCategory) {
            itemData.category_id = newCategory.id;
            console.log(`  ✓ Categoría mapeada: "${categoryName}" → ${newCategory.id}`);
          } else {
            console.warn(`  ⚠️ Categoría "${categoryName}" no encontrada para item [${index}]`);
            itemData.category_id = currentCategories[0]?.id || '';
          }

          // Mapear ingredient_ids por nombre
          const oldIngIds = item.ingredient_ids || [];
          itemData.ingredient_ids = oldIngIds.map(oldId => {
            const ingName = importResult.ingredients.data.find(i => i.id === oldId)?.name;
            const newIng = currentIngredients.find((i: Ingredient) => i.name === ingName);
            if (newIng) {
              console.log(`    ✓ Ingrediente mapeado: "${ingName}" → ${newIng.id}`);
              return newIng.id;
            }
            console.warn(`    ⚠️ Ingrediente "${ingName}" no encontrado`);
            return null;
          }).filter((id): id is string => id !== null);

          // Mapear accompaniment_ids por nombre
          const oldAccIds = item.accompaniment_ids || [];
          itemData.accompaniment_ids = oldAccIds.map(oldId => {
            const accName = importResult.accompaniments.data.find(a => a.id === oldId)?.name;
            const newAcc = currentAccompaniments.find((a: Accompaniment) => a.name === accName);
            if (newAcc) {
              console.log(`    ✓ Acompañante mapeado: "${accName}" → ${newAcc.id}`);
              return newAcc.id;
            }
            console.warn(`    ⚠️ Acompañante "${accName}" no encontrado`);
            return null;
          }).filter((id): id is string => id !== null);

          console.log(`  → Creando item menú [${index}]:`, itemData);
          return dispatch(addNewMenuItem(itemData)).unwrap();
        });

        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const error = `Item Menú [${index}]: ${result.reason?.message || result.reason}`;
            console.error('❌', error);
            errors.push(error);
          } else {
            console.log(`  ✅ Item menú creado: "${result.value.name}"`);
          }
        });
        const success = results.filter(r => r.status === 'fulfilled').length;
        totalSuccess += success;
        totalFailed += results.length - success;
      }

      // Refrescar todas las listas al final para actualizar el UI
      console.log('🔄 Refrescando listas...');
      await Promise.all([
        dispatch(fetchCategories()).unwrap(),
        dispatch(fetchIngredients()).unwrap(),
        dispatch(fetchAccompaniments()).unwrap(),
        dispatch(fetchMenu()).unwrap(),
      ]);

      // Mostrar resultado final con detalles
      console.log(`\n📊 RESUMEN DE IMPORTACIÓN:`);
      console.log(`  ✅ Éxitos: ${totalSuccess}`);
      console.log(`  ❌ Fallos: ${totalFailed}`);
      if (errors.length > 0) {
        console.log(`\n🔍 ERRORES DETALLADOS:`);
        errors.forEach(err => console.log(`  - ${err}`));
      }

      if (totalFailed === 0) {
        alert(`✅ ¡Importación completada exitosamente!\n\n📊 ${totalSuccess} registros guardados en la base de datos.`);
      } else {
        const errorSummary = errors.slice(0, 5).join('\n');
        const moreErrors = errors.length > 5 ? `\n\n... y ${errors.length - 5} errores más` : '';
        alert(`⚠️ Importación parcial:\n\n✅ ${totalSuccess} registros guardados\n❌ ${totalFailed} fallaron\n\n🔍 Primeros errores:\n${errorSummary}${moreErrors}\n\nRevisa la consola para detalles completos.`);
      }

      // Limpiar y cerrar solo si fue exitoso
      if (totalFailed === 0) {
        setImportResult(null);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('❌ Error crítico al guardar datos:', error);
      alert(`❌ Error crítico al guardar los datos:\n\n${(error as Error).message || 'Error desconocido'}\n\nRevisa la consola para más detalles.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadUnifiedTemplate();
    alert('📥 Plantilla descargada. Completa las hojas y vuelve a importar.');
  };

  return (
    <>
      {/* Botón Flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 group"
          title="Importar/Exportar Datos"
        >
          <FaFileExcel className="text-2xl group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FaFileExcel className="text-3xl" />
                  Gestión de Datos
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  Importa o exporta todos los datos del sistema en un solo archivo
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Exportar Datos */}
              <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50">
                <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FaDownload className="text-green-600" />
                  Exportar Datos
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Descarga un archivo Excel con todas las categorías, ingredientes, acompañantes y menú.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportAll}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <FaDownload />
                    Exportar Todo
                  </button>
                </div>
                <div className="mt-4 bg-white border border-green-300 rounded-lg p-3">
                  <p className="text-xs text-gray-700 font-semibold mb-2">📊 Datos a exportar:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>✓ {categories.length} Categorías</li>
                    <li>✓ {ingredients.length} Ingredientes</li>
                    <li>✓ {accompaniments.length} Acompañantes</li>
                    <li>✓ {menuItems.length} Items del Menú</li>
                  </ul>
                </div>
              </div>

              {/* Importar Datos */}
              <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FaUpload className="text-blue-600" />
                  Importar Datos
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Carga un archivo Excel con el formato correcto. Puedes descargar la plantilla como referencia.
                </p>
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex-1 bg-blue-100 text-blue-800 px-4 py-3 rounded-lg font-semibold hover:bg-blue-200 transition-all flex items-center justify-center gap-2 border-2 border-blue-300"
                  >
                    <FaFileImport />
                    Descargar Plantilla
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Leyendo archivo...</span>
                      </>
                    ) : (
                      <>
                        <FaUpload />
                        <span>Importar Archivo</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportAll}
                  className="hidden"
                />

                {/* Resultado de la Importación */}
                {importResult && (
                  <div className={`mt-4 p-4 rounded-lg border-2 ${
                    importResult.success
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <p className={`font-bold mb-2 ${
                      importResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {importResult.success ? '✅ Archivo Validado Correctamente' : '⚠️ Validación con Errores'}
                    </p>
                    <div className="text-sm space-y-1 mb-4">
                      <p>📁 Categorías: {importResult.categories.validRows}/{importResult.categories.totalRows} válidas</p>
                      <p>🌿 Ingredientes: {importResult.ingredients.validRows}/{importResult.ingredients.totalRows} válidos</p>
                      <p>🍞 Acompañantes: {importResult.accompaniments.validRows}/{importResult.accompaniments.totalRows} válidos</p>
                      <p>🍽️ Menú: {importResult.menu.validRows}/{importResult.menu.totalRows} válidos</p>
                    </div>

                    {/* Botón para guardar datos */}
                    {importResult.success && (
                      <button
                        onClick={handleSaveImportedData}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {saving ? (
                          <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Guardando en Base de Datos...</span>
                          </>
                        ) : (
                          <>
                            <FaCheckCircle />
                            <span>Confirmar y Guardar en BD</span>
                          </>
                        )}
                      </button>
                    )}

                    {importResult.globalErrors.length > 0 && (
                      <div className="mt-3 bg-red-100 border border-red-300 rounded p-2">
                        <p className="text-xs font-bold text-red-800 mb-1">Errores globales:</p>
                        <ul className="text-xs text-red-700 list-disc list-inside">
                          {importResult.globalErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Información */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                <p className="text-sm text-yellow-900 font-semibold mb-2">
                  ⚠️ Importante:
                </p>
                <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                  <li>El archivo debe tener 4 hojas: Categorías, Ingredientes, Acompañantes y Menú</li>
                  <li>Las columnas deben coincidir exactamente con la plantilla</li>
                  <li>Los IDs deben ser válidos y existentes para relaciones</li>
                  <li>La importación reemplazará los datos existentes con el mismo ID</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataExchangeButton;

