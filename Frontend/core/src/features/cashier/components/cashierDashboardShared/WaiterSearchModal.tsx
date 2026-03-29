import React from 'react';

interface WaiterSearchModalProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export const WaiterSearchModal: React.FC<WaiterSearchModalProps> = ({
  isOpen,
  value,
  onChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  const trimmedValue = value.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-indigo-100">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Buscar Comandas por Mesero</h2>
              <p className="text-xs text-indigo-100">Filtra por nombre y revisa grupos o comandas individuales</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              aria-label="Cerrar buscador por mesero"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre del mesero
          </label>
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && trimmedValue) {
                  onSubmit(trimmedValue);
                }
              }}
              placeholder="Ej: Juan o Maria"
              className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
            {value && (
              <button
                onClick={() => onChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-1"
                aria-label="Limpiar búsqueda por mesero"
              >
                ✕
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Verás las comandas del mesero agrupadas por mesa y enlaces padre/hija cuando existan.
          </p>
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={() => onSubmit(trimmedValue)}
            disabled={!trimmedValue}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Ir a resultados
          </button>
        </div>
      </div>
    </div>
  );
};
