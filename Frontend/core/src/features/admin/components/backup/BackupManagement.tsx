import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FaCloudUploadAlt, FaDownload, FaFileImport } from 'react-icons/fa';
import type { RootState } from '../../../../app/store';
import {
  exportCatalogBackup,
  importCatalogBackup,
  type CatalogRestoreResult,
} from './api/backupAPI';

const BackupManagement: React.FC = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CatalogRestoreResult | null>(null);

  const isBusy = isExporting || isImporting;

  const filename = useMemo(() => {
    if (!selectedFile) {
      return 'Ningun archivo seleccionado';
    }

    return selectedFile.name;
  }, [selectedFile]);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
    setResult(null);
  };

  const handleExport = async () => {
    if (!token) {
      setError('No hay sesion activa. Inicia sesion nuevamente.');
      return;
    }

    resetFeedback();
    setIsExporting(true);

    try {
      const response = await exportCatalogBackup(token);
      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const filenameMatch = contentDisposition?.match(/filename="?([^\"]+)"?/i);
      const downloadName = filenameMatch?.[1] || `catalog_backup_${new Date().toISOString()}.json`;

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setMessage('Backup exportado correctamente.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error || err.message || 'No se pudo exportar el backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!token) {
      setError('No hay sesion activa. Inicia sesion nuevamente.');
      return;
    }

    if (!selectedFile) {
      setError('Selecciona un archivo JSON de backup antes de importar.');
      return;
    }

    resetFeedback();
    setIsImporting(true);

    try {
      const response = await importCatalogBackup(token, selectedFile);
      setResult(response.result);
      setMessage(response.message);
      setSelectedFile(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error || err.message || 'No se pudo importar el backup.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-xl font-bold text-slate-800">Backup de Catalogo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Exporta o importa el catalogo administrativo (mesas, estaciones, impresoras, categorias, ingredientes,
          acompanamientos y menu).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-emerald-700">
            <FaDownload />
            <h3 className="font-semibold">Exportar backup</h3>
          </div>
          <p className="mb-4 text-sm text-slate-600">Descarga un archivo JSON con el estado actual del catalogo.</p>
          <button
            onClick={handleExport}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaDownload />
            {isExporting ? 'Exportando...' : 'Exportar ahora'}
          </button>
        </div>

        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-blue-700">
            <FaCloudUploadAlt />
            <h3 className="font-semibold">Importar backup</h3>
          </div>
          <p className="mb-3 text-sm text-slate-600">
            Carga un JSON exportado desde este sistema para restaurar el catalogo.
          </p>

          <label className="mb-3 block w-full cursor-pointer rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700 hover:bg-blue-100">
            <span className="flex items-center gap-2">
              <FaFileImport />
              Seleccionar archivo JSON
            </span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          <p className="mb-4 truncate text-sm text-slate-700">{filename}</p>

          <button
            onClick={handleImport}
            disabled={isBusy || !selectedFile}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaCloudUploadAlt />
            {isImporting ? 'Importando...' : 'Importar backup'}
          </button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">{message}</div>}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {result && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-800">Resumen de importacion</h3>
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p>Mesas importadas: {result.tables_imported}</p>
            <p>Estaciones importadas: {result.stations_imported}</p>
            <p>Impresoras importadas: {result.printers_imported}</p>
            <p>Categorias importadas: {result.categories_imported}</p>
            <p>Ingredientes importados: {result.ingredients_imported}</p>
            <p>Acompanamientos importados: {result.accompaniments_imported}</p>
            <p>Items de menu importados: {result.menu_items_imported}</p>
            <p>Relaciones menu-ingrediente: {result.menu_ingredient_links_imported}</p>
            <p>Relaciones menu-acompanamiento: {result.menu_accompaniment_links_imported}</p>
            <p>Usuarios omitidos: {result.users_skipped}</p>
          </div>
          {result.warning && <p className="mt-4 text-sm text-amber-700">{result.warning}</p>}
        </div>
      )}
    </div>
  );
};

export default BackupManagement;
