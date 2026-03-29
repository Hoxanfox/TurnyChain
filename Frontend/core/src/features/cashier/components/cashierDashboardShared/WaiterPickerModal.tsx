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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl shadow-2xl border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Seleccionar Mesero</h2>
              <p className="text-xs text-indigo-100">Seleccion rapida de comandas por mesero</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              aria-label="Cerrar selector de mesero"
            >
              ✕
            </button>
          </div>
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
                    className={`rounded-2xl p-3 transition-all border text-left ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]'
                        : 'bg-white text-gray-800 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide opacity-80">Mesero</p>
                    <p className="text-base font-extrabold mt-1 truncate" title={waiter.name}>{waiter.name}</p>
                    <div className="mt-2 flex items-center justify-between text-xs opacity-90">
                      <span>Comandas: {waiter.ordersCount}</span>
                      <span>Mesas: {waiter.tablesCount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>{waiters.length} mesero(s) disponible(s)</span>
            <button
              onClick={() => {
                onClear();
                onClose();
              }}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
            >
              Limpiar seleccion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
