import React, { useEffect } from 'react';
import { useCierreCaja } from '../hooks/useCierreCaja';
import type { CashierSession } from '../types/cajaTypes';

interface CierreCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: CashierSession | null;
  onCloseCaja: (actualCash: number, notes: string) => Promise<CashierSession>;
}

export const CierreCajaModal: React.FC<CierreCajaModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onCloseCaja,
}) => {
  const {
    actualCashStr,
    setActualCashStr,
    notes,
    setNotes,
    isConfirmed,
    setIsConfirmed,
    isLoading,
    error,
    initialFund,
    cashSales,
    transferSales,
    expenses,
    totalExpenses,
    expectedCash,
    discrepancy,
    discrepancyType,
    isDiscrepancy,
    isFormValid,
    handleCierreSubmit,
    resetForm,
  } = useCierreCaja(activeSession, onClose, onCloseCaja);

  // Resetear al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen || !activeSession) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-red-600 to-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            <div>
              <h2 className="text-xl font-bold">Cerrar Caja</h2>
              <p className="text-xs text-white/80">Arqueo y cierre del turno actual</p>
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
        <form onSubmit={handleCierreSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Sección 1: Totales de Ventas y Base */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-900/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              1. Resumen de Turno (Ventas)
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">Fondo Inicial Base</p>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                  {formatCurrency(initialFund)}
                </p>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">Efectivo Vendido</p>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                  {formatCurrency(cashSales)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50 dark:border-slate-850/50">
              <span className="font-semibold text-slate-500">Ventas en Transferencia:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(transferSales)}
              </span>
            </div>
          </div>

          {/* Sección 2: Gastos Registrados */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-900/80 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                2. Egresos/Gastos del Turno
              </h3>
              <span className="text-xs font-bold text-rose-500">
                -{formatCurrency(totalExpenses)}
              </span>
            </div>

            {expenses.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No se registraron gastos en este turno.</p>
            ) : (
              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-start text-xs bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-700 dark:text-slate-300 truncate">
                        {exp.description}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {new Date(exp.created_at).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-semibold text-rose-600">-{formatCurrency(exp.amount)}</span>
                      {exp.image_path && (
                        <a
                          href={`/api${exp.image_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold"
                        >
                          Ver
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección 3: Conciliación de Caja */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              3. Conciliación y Efectivo Real
            </h3>

            {/* Efectivo Esperado */}
            <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                Efectivo Esperado en Caja:
                <p className="text-[9px] font-normal text-indigo-500 mt-0.5">
                  Base ({formatCurrency(initialFund)}) + Efectivo ({formatCurrency(cashSales)}) - Gastos ({formatCurrency(totalExpenses)})
                </p>
              </div>
              <span className="text-lg font-extrabold text-indigo-800 dark:text-indigo-300">
                {formatCurrency(expectedCash)}
              </span>
            </div>

            {/* Efectivo Real */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Efectivo Real en Caja (Arqueo Físico) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="Digita el dinero total en la gaveta"
                  min="0"
                  value={actualCashStr}
                  onChange={(e) => setActualCashStr(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-lg font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Descuadre Dinámico */}
          {actualCashStr !== '' && (
            <div className="transition-all duration-300">
              {discrepancyType === 'square' ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl p-4 flex gap-3 items-start">
                  <span className="text-2xl mt-0.5">🎉</span>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Caja Cuadrada</h4>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      Los valores cuadran a la perfección. No hay sobrantes ni faltantes.
                    </p>
                  </div>
                </div>
              ) : discrepancyType === 'missing' ? (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl p-4 flex gap-3 items-start">
                  <span className="text-2xl mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex justify-between">
                      <span>Faltante en Caja</span>
                      <span className="font-extrabold">{formatCurrency(Math.abs(discrepancy))}</span>
                    </h4>
                    <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                      Falta dinero físico. Debes justificar obligatoriamente esta diferencia.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 items-start">
                  <span className="text-2xl mt-0.5">💡</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex justify-between">
                      <span>Sobrante en Caja</span>
                      <span className="font-extrabold">{formatCurrency(discrepancy)}</span>
                    </h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                      Sobra dinero físico en la gaveta. Justifica obligatoriamente esta diferencia.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Observaciones {isDiscrepancy ? '*' : '(Opcional)'}
            </label>
            <textarea
              placeholder={
                isDiscrepancy
                  ? 'Por favor explica la diferencia / descuadre registrado...'
                  : 'Registra novedades adicionales del turno si las hay...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full p-3 bg-white dark:bg-slate-950 border ${
                isDiscrepancy && notes.trim() === ''
                  ? 'border-rose-400 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-500'
              } rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:outline-none min-h-[75px]`}
              disabled={isLoading}
              required={isDiscrepancy}
            />
          </div>

          {/* Checkbox de Seguridad */}
          <div>
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-900/50 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/60 transition-colors">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                disabled={isLoading}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium select-none leading-relaxed">
                Confirmo que el arqueo de cierre físico coincide con lo digitado. Esta acción registrará el reporte oficial y terminará mi sesión de turno.
              </span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl active:scale-95 transition-all text-sm border border-transparent dark:border-slate-800"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 font-semibold rounded-2xl text-white active:scale-95 transition-all text-sm flex items-center justify-center gap-2 ${
                isFormValid && !isLoading
                  ? 'bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 shadow-md'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Cerrando...</span>
                </>
              ) : (
                'Confirmar Cierre'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
