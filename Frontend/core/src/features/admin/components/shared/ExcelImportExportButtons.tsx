// =================================================================
// COMPONENTE REUTILIZABLE DE IMPORTACIÓN/EXPORTACIÓN EXCEL
// =================================================================
import React, { useRef, useState } from 'react';
import { FaFileExcel, FaFileUpload, FaFileDownload, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import type { ImportResult, ValidationError } from '../../../../utils/excelUtils';

interface ExcelImportExportButtonsProps<T = unknown> {
  entityType: 'menu' | 'categories' | 'ingredients' | 'accompaniments';
  onExport: () => void;
  onImport: (file: File) => Promise<ImportResult<T>>;
  onConfirmImport: (data: T[]) => Promise<void>;
  onDownloadTemplate: () => void;
}

const ExcelImportExportButtons = <T = unknown,>({
  entityType,
  onExport,
  onImport,
  onConfirmImport,
  onDownloadTemplate,
}: ExcelImportExportButtonsProps<T>) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<T> | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const entityNames: Record<string, string> = {
    menu: 'Menú',
    categories: 'Categorías',
    ingredients: 'Ingredientes',
    accompaniments: 'Acompañantes',
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo Excel
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
      return;
    }

    setIsImporting(true);
    try {
      const result = await onImport(file);
      setImportResult(result);
      setShowModal(true);
    } catch (error) {
      alert('Error al procesar el archivo: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult?.data) return;

    setIsImporting(true);
    try {
      // Llamar a la función de confirmación proporcionada
      await onConfirmImport(importResult.data);

      // Éxito: mostrar mensaje y cerrar modal
      alert(`✅ Importación completada exitosamente!\n\n📊 ${importResult.validRows} ${entityNames[entityType].toLowerCase()} guardados correctamente.\n\nLos datos han sido persistidos en la base de datos.`);
      setShowModal(false);
      setImportResult(null);
    } catch (error) {
      console.error('Error durante la importación:', error);
      // Mantener el modal abierto para que el usuario pueda reintentar
      alert(`❌ Error al guardar los datos:\n\n${(error as Error).message || 'Error desconocido'}\n\nPor favor, verifica tu conexión e intenta nuevamente.`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setImportResult(null);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Botón Exportar */}
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <FaFileDownload className="text-lg" />
          <span>Exportar a Excel</span>
        </button>

        {/* Botón Importar */}
        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer">
          <FaFileUpload className="text-lg" />
          <span>Importar desde Excel</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isImporting}
          />
        </label>

        {/* Botón Descargar Plantilla */}
        <button
          onClick={onDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <FaFileExcel className="text-lg" />
          <span>Descargar Plantilla</span>
        </button>
      </div>

      {/* Modal de Confirmación/Errores */}
      {showModal && importResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 border-b ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {importResult.success ? (
                    <FaCheckCircle className="text-green-600 text-2xl" />
                  ) : (
                    <FaExclamationTriangle className="text-red-600 text-2xl" />
                  )}
                  <h3 className="text-xl font-bold text-gray-800">
                    {importResult.success ? 'Archivo Validado Correctamente' : 'Errores de Validación'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium mb-1">Total de Filas</p>
                  <p className="text-3xl font-bold text-blue-700">{importResult.totalRows}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-600 font-medium mb-1">Filas Válidas</p>
                  <p className="text-3xl font-bold text-green-700">{importResult.validRows}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm text-red-600 font-medium mb-1">Errores</p>
                  <p className="text-3xl font-bold text-red-700">{importResult.errors.length}</p>
                </div>
              </div>

              {/* Lista de Errores */}
              {importResult.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaExclamationTriangle className="text-yellow-600" />
                    Detalles de Errores:
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {importResult.errors.map((error: ValidationError, index: number) => (
                      <div
                        key={index}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm"
                      >
                        <p className="font-medium text-red-800">
                          Fila {error.row} - Campo: {error.field}
                        </p>
                        <p className="text-red-600">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview de Datos Válidos */}
              {importResult.validRows > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaCheckCircle className="text-green-600" />
                    Vista Previa de Datos a Importar:
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">
                      Se importarán <span className="font-bold text-green-600">{importResult.validRows}</span> registros válidos.
                    </p>
                    {importResult.data.length > 0 && (
                      <div className="mt-3 text-xs text-gray-500">
                        <p className="font-medium mb-1">Ejemplo (primer registro):</p>
                        <pre className="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                          {JSON.stringify(importResult.data[0], null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={isImporting}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Guardando...' : 'Cancelar'}
              </button>
              {importResult.success && importResult.validRows > 0 && (
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Guardando en BD...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      <span>Confirmar y Guardar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExcelImportExportButtons;

