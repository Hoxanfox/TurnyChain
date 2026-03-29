import React from 'react';

interface OrderIdSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const OrderIdSearchBar: React.FC<OrderIdSearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Buscar por ID de comanda
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ej: 9f3a o ID completo"
          className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-1"
            aria-label="Limpiar búsqueda por ID"
          >
            ✕
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Si coincide una comanda hija o padre, se muestran todas las comandas asociadas del grupo.
      </p>
    </div>
  );
};
