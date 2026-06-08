import React, { useState, useEffect } from 'react';

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (amount: number, description: string, file: File | null) => Promise<any>;
}

export const GastoModal: React.FC<GastoModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Limpiar preview al desmontar o cerrar
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Resetear estados al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setDescription('');
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amount = parseFloat(amountStr);
  const isFormValid = !isNaN(amount) && amount > 0 && description.trim().length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Generar Object URL para previsualización inmediata
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      await onAddExpense(amount, description.trim(), file);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar el egreso.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💸</span>
            <div>
              <h2 className="text-xl font-bold">Registrar Gasto</h2>
              <p className="text-xs text-white/80">Egresos y compras del turno</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white font-bold"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Monto del Gasto */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Monto del Gasto ($) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-bold">$</span>
              <input
                type="number"
                placeholder="Digita el valor pagado"
                min="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-lg font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Descripción del Gasto */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Concepto / Descripción *
            </label>
            <textarea
              placeholder="Ej. Compra de limones para el bar, repuesto de escoba..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[90px]"
              disabled={isLoading}
              required
            />
          </div>

          {/* Comprobante Opcional (Imagen) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Comprobante / Recibo (Opcional)
            </label>

            {!file ? (
              <div className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-all cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isLoading}
                />
                <span className="text-3xl mb-1">📸</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Adjuntar Foto</span>
                <span className="text-[10px] text-slate-400">Toca para seleccionar desde la galería</span>
              </div>
            ) : (
              <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview comprobante"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors font-bold"
                  disabled={isLoading}
                >
                  Quitar
                </button>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl transition-all text-sm active:scale-95 border border-transparent dark:border-slate-800"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 font-semibold rounded-2xl text-white transition-all text-sm active:scale-95 flex items-center justify-center gap-2 ${
                isFormValid && !isLoading
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md shadow-orange-100 dark:shadow-none'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                'Registrar Gasto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
