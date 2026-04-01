import React from 'react';

type ValidationStep = 'session' | 'printer' | 'saving';

interface PaymentValidationModalProps {
  isOpen: boolean;
  currentStep: ValidationStep;
  tableNumber: number;
  errorMessage?: string | null;
  onRetry?: () => void;
  onBackToCheckout?: () => void;
}

const stepOrder: ValidationStep[] = ['session', 'printer', 'saving'];

const stepConfig: Record<ValidationStep, { title: string; subtitle: string; icon: string }> = {
  session: {
    title: 'Validando sesion',
    subtitle: 'Comprobando internet y token activo',
    icon: '🔐',
  },
  printer: {
    title: 'Validando impresoras',
    subtitle: 'Comprobando que haya una impresora operativa',
    icon: '🖨️',
  },
  saving: {
    title: 'Guardando comanda',
    subtitle: 'Registrando orden y pago en el backend',
    icon: '💾',
  },
};

const PaymentValidationModal: React.FC<PaymentValidationModalProps> = ({
  isOpen,
  currentStep,
  tableNumber,
  errorMessage,
  onRetry,
  onBackToCheckout,
}) => {
  if (!isOpen) {
    return null;
  }

  const activeIndex = stepOrder.indexOf(currentStep);
  const hasError = !!errorMessage;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 text-white px-6 py-5">
          <p className="text-xs uppercase tracking-[0.18em] opacity-80">Proceso de cobro</p>
          <h3 className="text-xl font-bold mt-1">Mesa {tableNumber}</h3>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className={`flex items-center gap-4 rounded-xl border p-4 ${hasError ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-4xl ${hasError ? '' : 'animate-pulse'}`}>{hasError ? '⚠️' : stepConfig[currentStep].icon}</div>
            <div>
              <p className={`text-base font-bold ${hasError ? 'text-rose-800' : 'text-slate-800'}`}>
                {hasError ? 'No se pudo completar la validacion' : stepConfig[currentStep].title}
              </p>
              <p className={`text-sm ${hasError ? 'text-rose-700' : 'text-slate-600'}`}>
                {hasError ? errorMessage : stepConfig[currentStep].subtitle}
              </p>
            </div>
          </div>

          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${((activeIndex + 1) / stepOrder.length) * 100}%` }}
            />
          </div>

          <div className="space-y-2">
            {stepOrder.map((step, index) => {
              const isDone = index < activeIndex;
              const isActive = index === activeIndex;

              return (
                <div
                  key={step}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-all ${
                    isDone
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : isActive
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  <span className="text-sm font-medium">{stepConfig[step].title}</span>
                  <span className="text-sm">
                    {isDone ? '✅' : isActive ? '⏳' : '•'}
                  </span>
                </div>
              );
            })}
          </div>

          {!hasError && (
            <p className="text-xs text-slate-500 text-center animate-pulse">
              Espera un momento. No cierres esta pantalla.
            </p>
          )}

          {hasError && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onBackToCheckout}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Volver al cobro
              </button>
              <button
                onClick={onRetry}
                className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white hover:from-indigo-700 hover:to-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentValidationModal;
