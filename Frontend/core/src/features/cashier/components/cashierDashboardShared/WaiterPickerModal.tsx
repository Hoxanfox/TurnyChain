import React from 'react';

interface WaiterOption {
  name: string;
  ordersCount: number;
  tablesCount: number;
}

interface WaiterPickerModalProps {
  isOpen: boolean;
  waiters: WaiterOption[];
  selectedWaiter?: string;
  onSelectWaiter: (waiterName: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const WaiterPickerModal: React.FC<WaiterPickerModalProps> = ({
  isOpen,
  waiters,
  selectedWaiter = '',
  onSelectWaiter,
  onClear,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Seleccionar Mesero</h2>
              <p className="text-sm font-medium text-slate-500">Selección rápida de comandas activas</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all">
            ✕
          </button>
        </div>

        <div className="p-4">
          {waiters.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No hay meseros con comandas activas.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[52vh] overflow-y-auto pr-1">
              {waiters.map((waiter) => {
                const isSelected = selectedWaiter.trim().toLowerCase() === waiter.name.trim().toLowerCase();
                return (
                  <button
                    key={waiter.name}
                    onClick={() => {
                      onSelectWaiter(waiter.name);
                      onClose();
                    }}
                    className={`rounded-2xl p-4 transition-all border-2 text-left active:scale-95 flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mesero</p>
                    <p className="text-lg font-black truncate" title={waiter.name}>{waiter.name}</p>
                    <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50 p-2 rounded-xl">
                      <span className="flex items-center gap-1">🧾 {waiter.ordersCount} cmd</span>
                      <span className="flex items-center gap-1">🪑 {waiter.tablesCount} m</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-slate-500">
            <span>{waiters.length} mesero(s) disponible(s)</span>
            <button
              onClick={() => {
                onClear();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
