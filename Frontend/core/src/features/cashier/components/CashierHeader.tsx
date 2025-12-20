import React from 'react';
import LogoutButton from '../../../components/LogoutButton';

interface CashierHeaderProps {
  pendingVerificationCount: number;
  showStats: boolean;
  onToggleStats: () => void;
  onExportReport: () => void;
  activeFiltersCount?: number;
}

export const CashierHeader: React.FC<CashierHeaderProps> = ({
  pendingVerificationCount,
  showStats,
  onToggleStats,
  onExportReport,
  activeFiltersCount = 0,
}) => {
  return (
    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-lg shadow-xl p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="text-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">💰</span>
            <h1 className="text-3xl font-bold">Panel del Cajero</h1>
          </div>
          <p className="text-white/90 text-lg mb-3">Gestión de pagos y órdenes activas</p>

          <div className="flex flex-wrap gap-2 items-center">
            {pendingVerificationCount > 0 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="animate-pulse text-2xl">🔔</span>
                <span className="font-semibold">
                  {pendingVerificationCount} pago{pendingVerificationCount !== 1 ? 's' : ''} por verificar
                </span>
              </div>
            )}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-xl">🔍</span>
                <span className="font-semibold">
                  {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={onToggleStats}
            className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            title={showStats ? 'Ocultar estadísticas' : 'Mostrar estadísticas'}
          >
            📊 {showStats ? 'Ocultar' : 'Mostrar'} Stats
          </button>
          <button
            onClick={onExportReport}
            className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            title="Exportar reporte CSV"
          >
            📥 Exportar
          </button>
          <div className="bg-white rounded-lg p-1">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
};

