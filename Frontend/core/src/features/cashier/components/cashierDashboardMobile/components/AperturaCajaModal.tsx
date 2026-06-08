import React, { useState } from 'react';

interface AperturaCajaModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpenCaja: (initialFund: number) => Promise<any>;
  onLogout?: () => void;
}

export const AperturaCajaModal: React.FC<AperturaCajaModalProps> = ({
  isOpen,
  onClose,
  onOpenCaja,
  onLogout,
}) => {
  const [initialFundStr, setInitialFundStr] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const initialFund = parseFloat(initialFundStr);
  const isValid = !isNaN(initialFund) && initialFund >= 0 && isVerified;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      await onOpenCaja(initialFund);
      setInitialFundStr('');
      setIsVerified(false);
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error al intentar abrir la caja.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Botón de cerrar (X) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition-all text-lg font-bold"
            disabled={isLoading}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        )}
        
        {/* Cabecera / Icono */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl text-3xl">
            🔑
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            Apertura de Caja
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registra la base de efectivo inicial antes de iniciar tus operaciones de cobro.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input de Fondo Inicial */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Fondo Inicial Base ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-bold">$</span>
              <input
                type="number"
                placeholder="Digita la base de efectivo"
                min="0"
                value={initialFundStr}
                onChange={(e) => setInitialFundStr(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-lg font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                disabled={isLoading}
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Es el efectivo base/cambio con el que arranca tu turno de hoy.
            </p>
          </div>

          {/* Checkbox de Verificación */}
          <label className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-colors">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium select-none leading-relaxed">
              Confirmo que he contado la base física de la caja registradora y coincide con el fondo inicial digitado.
            </span>
          </label>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  onLogout();
                }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl transition-all text-sm active:scale-95 border border-transparent dark:border-slate-800"
                disabled={isLoading}
              >
                Cerrar Sesión
              </button>
            )}
            <button
              type="submit"
              className={`flex-1 py-3 font-semibold rounded-2xl text-white transition-all text-sm active:scale-95 flex items-center justify-center gap-2 ${
                isValid && !isLoading
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-100 dark:shadow-none'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Iniciando...</span>
                </>
              ) : (
                'Iniciar Caja'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
