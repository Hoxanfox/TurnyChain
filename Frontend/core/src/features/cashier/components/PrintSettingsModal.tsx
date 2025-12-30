// =================================================================
// ARCHIVO: /src/features/cashier/components/PrintSettingsModal.tsx
// Modal para configurar opciones de impresión de comandas
// =================================================================

import React, { useState, useEffect } from 'react';
import { getPrintSettings, savePrintSettings, type PrintSettings } from '../../../utils/printUtils';

interface PrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<PrintSettings>(getPrintSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getPrintSettings());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    savePrintSettings(settings);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleChange = (key: keyof PrintSettings, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🖨️</span>
              <div>
                <h2 className="text-xl font-bold">Configuración de Impresión</h2>
                <p className="text-sm text-purple-100 mt-1">Ajusta las opciones de comandas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Modo de impresión */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="text-xl">⚡</span>
              Modo de Impresión
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                <input
                  type="radio"
                  name="autoPrint"
                  checked={!settings.autoPrint}
                  onChange={() => handleChange('autoPrint', false)}
                  className="w-5 h-5 text-purple-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Con Confirmación</div>
                  <div className="text-sm text-gray-600">Pregunta antes de imprimir cada comanda</div>
                </div>
                <span className="text-2xl">🤔</span>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                <input
                  type="radio"
                  name="autoPrint"
                  checked={settings.autoPrint}
                  onChange={() => handleChange('autoPrint', true)}
                  className="w-5 h-5 text-purple-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Automática</div>
                  <div className="text-sm text-gray-600">Imprime inmediatamente sin preguntar</div>
                </div>
                <span className="text-2xl">🚀</span>
              </label>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="text-xl">🍽️</span>
              Apariencia
            </label>
            <label className="flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.includeLogo}
                  onChange={(e) => handleChange('includeLogo', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <div className="font-semibold text-gray-800">Incluir Logo</div>
                  <div className="text-sm text-gray-600">Mostrar logo en la comanda</div>
                </div>
              </div>
              <span className="text-2xl">🍽️</span>
            </label>
          </div>

          {/* Tamaño de fuente */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="text-xl">📝</span>
              Tamaño de Fuente
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleChange('fontSize', 'small')}
                className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                  settings.fontSize === 'small'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="text-xs">Pequeño</div>
                <div className="text-xs mt-1">10px</div>
              </button>
              <button
                onClick={() => handleChange('fontSize', 'medium')}
                className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                  settings.fontSize === 'medium'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="text-sm">Mediano</div>
                <div className="text-xs mt-1">12px</div>
              </button>
              <button
                onClick={() => handleChange('fontSize', 'large')}
                className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                  settings.fontSize === 'large'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="text-base">Grande</div>
                <div className="text-xs mt-1">14px</div>
              </button>
            </div>
          </div>

          {/* Tamaño de papel */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="text-xl">📏</span>
              Tamaño de Papel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleChange('paperSize', '58mm')}
                className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                  settings.paperSize === '58mm'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                <div className="text-xs">58mm</div>
                <div className="text-xs mt-1">Térmico</div>
              </button>
              <button
                onClick={() => handleChange('paperSize', '80mm')}
                className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                  settings.paperSize === '80mm'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                <div className="text-sm">80mm</div>
                <div className="text-xs mt-1">Térmico</div>
              </button>
              <button
                onClick={() => handleChange('paperSize', 'A4')}
                className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                  settings.paperSize === 'A4'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                <div className="text-base">A4</div>
                <div className="text-xs mt-1">Carta</div>
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Ajusta según tu tipo de impresora
            </p>
          </div>

          {/* Método de impresión de tickets */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="text-xl">🏪</span>
              Impresión de Tickets de Cocina
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                <input
                  type="radio"
                  name="ticketPrintMethod"
                  checked={settings.ticketPrintMethod === 'backend'}
                  onChange={() => handleChange('ticketPrintMethod', 'backend')}
                  className="w-5 h-5 text-indigo-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Backend (Impresoras Térmicas)</div>
                  <div className="text-sm text-gray-600">Impresión automática en impresoras configuradas</div>
                </div>
                <span className="text-2xl">🖨️</span>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                <input
                  type="radio"
                  name="ticketPrintMethod"
                  checked={settings.ticketPrintMethod === 'frontend'}
                  onChange={() => handleChange('ticketPrintMethod', 'frontend')}
                  className="w-5 h-5 text-indigo-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Frontend (Navegador)</div>
                  <div className="text-sm text-gray-600">Imprime desde el navegador, elige tu impresora</div>
                </div>
                <span className="text-2xl">🌐</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
              💡 <strong>Backend:</strong> Requiere impresoras configuradas. <strong>Frontend:</strong> Funciona siempre, sin configuración.
            </p>
          </div>

          {/* Número de copias */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="text-xl">📄</span>
              Número de Copias
            </label>
            <div className="flex items-center gap-4 p-4 border-2 rounded-lg">
              <button
                onClick={() => handleChange('copies', Math.max(1, settings.copies - 1))}
                className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl transition-all"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-purple-600">{settings.copies}</div>
                <div className="text-sm text-gray-600">
                  {settings.copies === 1 ? 'copia' : 'copias'}
                </div>
              </div>
              <button
                onClick={() => handleChange('copies', Math.min(5, settings.copies + 1))}
                className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-xl transition-all"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Útil para cocina, bar, o copias adicionales
            </p>
          </div>

          {/* Vista previa de configuración */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border-2 border-purple-200">
            <div className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <span>📋</span>
              Resumen de Configuración
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Modo:</span>
                <span className="font-semibold">
                  {settings.autoPrint ? '🚀 Automático' : '🤔 Con confirmación'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Logo:</span>
                <span className="font-semibold">{settings.includeLogo ? '✅ Sí' : '❌ No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tamaño:</span>
                <span className="font-semibold capitalize">{settings.fontSize}</span>
              </div>
              <div className="flex justify-between">
                <span>Papel:</span>
                <span className="font-semibold">{settings.paperSize}</span>
              </div>
              <div className="flex justify-between">
                <span>Copias:</span>
                <span className="font-semibold">{settings.copies}</span>
              </div>
              <div className="flex justify-between">
                <span>Tickets Cocina:</span>
                <span className="font-semibold capitalize">
                  {settings.ticketPrintMethod === 'backend' ? '🖨️ Backend' : '🌐 Frontend'}
                </span>
              </div>
            </div>
          </div>

          {/* Mensaje de guardado */}
          {saved && (
            <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded-lg text-center font-semibold animate-pulse">
              ✅ Configuración guardada correctamente
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {saved ? '✅ Guardado' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

