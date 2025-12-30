import React from 'react';

interface QuickActionsBarProps {
  pendingCount: number;
  deliveredCount: number;
  paidCount: number;
  onFilterByStatus: (status: 'por_verificar' | 'entregado' | 'pagado') => void;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  pendingCount,
  deliveredCount,
  paidCount,
  onFilterByStatus,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-3 z-50">
      <div className="flex gap-2 max-w-screen-lg mx-auto">
        {/* Por Verificar */}
        <button
          onClick={() => onFilterByStatus('por_verificar')}
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl py-3 px-2 shadow-lg active:scale-95 transition-transform"
        >
          <div className="text-center">
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs font-semibold">⚠️ Por Verificar</p>
          </div>
        </button>

        {/* Entregados */}
        <button
          onClick={() => onFilterByStatus('entregado')}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 px-2 shadow-lg active:scale-95 transition-transform"
        >
          <div className="text-center">
            <p className="text-2xl font-bold">{deliveredCount}</p>
            <p className="text-xs font-semibold">✅ Entregados</p>
          </div>
        </button>

        {/* Pagados */}
        <button
          onClick={() => onFilterByStatus('pagado')}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl py-3 px-2 shadow-lg active:scale-95 transition-transform"
        >
          <div className="text-center">
            <p className="text-2xl font-bold">{paidCount}</p>
            <p className="text-xs font-semibold">💰 Pagados</p>
          </div>
        </button>
      </div>
    </div>
  );
};

