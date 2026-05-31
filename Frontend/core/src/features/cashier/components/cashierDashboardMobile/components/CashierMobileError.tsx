import React from 'react';

interface CashierMobileErrorProps {
  onRetry?: () => void;
  message?: string;
}

export const CashierMobileError: React.FC<CashierMobileErrorProps> = ({ onRetry, message }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="text-red-600 text-6xl mb-4">⚠️</div>
      <p className="text-red-600 font-semibold text-lg">Error al cargar las ordenes</p>
      <p className="text-gray-500 text-sm mt-1">{message || 'Verifica tu conexion o intenta nuevamente'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          🔄 Reintentar
        </button>
      )}
    </div>
  </div>
);
