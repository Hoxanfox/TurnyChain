import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../../../../components/LogoutButton';

interface CashierHeaderProps {
  pendingVerificationCount: number;
  pendingBlockchainCount: number;
  showStats: boolean;
  onToggleStats: () => void;
  onExportReport: () => void;
  onOpenPrintSettings: () => void;
  onOpenBlockchainModal: () => void;
  onOpenBrebPanel?: () => void;
  hasWsNotification?: boolean;
  onOpenPrintMonitor?: () => void;
  onOpenMetrics?: () => void;
  activeFiltersCount?: number;
  orderIdQuery?: string;
  onOpenOrderIdSearch?: () => void;
  waiterQuery?: string;
  onOpenWaiterSearch?: () => void;
  quickTablesCount?: number;
  onOpenQuickTableSelect?: () => void;
}

export const CashierHeader: React.FC<CashierHeaderProps> = ({
  pendingVerificationCount,
  pendingBlockchainCount,
  showStats,
  onToggleStats,
  onExportReport,
  onOpenPrintSettings,
  onOpenBlockchainModal,
  onOpenBrebPanel,
  hasWsNotification = false,
  onOpenPrintMonitor,
  onOpenMetrics,
  activeFiltersCount = 0,
  orderIdQuery = '',
  onOpenOrderIdSearch,
  waiterQuery = '',
  onOpenWaiterSearch,
  quickTablesCount = 0,
  onOpenQuickTableSelect,
}) => {
  const navigate = useNavigate();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

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

        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 mt-4 md:mt-0 w-full md:w-auto">
          <button
            onClick={() => navigate('/cashier/take-order')}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            title="Tomar Comanda como Mesero"
          >
            📝 Tomar Comanda
          </button>
          {onOpenQuickTableSelect && (
            <button
              onClick={onOpenQuickTableSelect}
              className="relative px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-all font-semibold shadow-lg hover:shadow-xl"
              title="Seleccion rapida de mesa"
            >
              🪑 Mesas
              {quickTablesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {quickTablesCount}
                </span>
              )}
            </button>
          )}
          {onOpenOrderIdSearch && (
            <button
              onClick={onOpenOrderIdSearch}
              className="relative px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-all font-semibold shadow-lg hover:shadow-xl"
              title="Buscar comanda por ID"
            >
              🔍 Buscar ID
              {orderIdQuery.trim() && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          )}
          {onOpenWaiterSearch && (
            <button
              onClick={onOpenWaiterSearch}
              className="relative px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-all font-semibold shadow-lg hover:shadow-xl"
              title="Buscar comandas por mesero"
            >
              👤 Mesero
              {waiterQuery.trim() && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          )}
          <button
            onClick={onToggleStats}
            className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            title={showStats ? 'Ocultar estadísticas' : 'Mostrar estadísticas'}
          >
            📊 {showStats ? 'Ocultar' : 'Mostrar'} Stats
          </button>
          <div className="relative">
            <button
              onClick={() => setIsActionsMenuOpen((prev) => !prev)}
              className="px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 relative"
              title="Abrir menú de acciones"
            >
              <span className="text-xl">☰</span>
              <span className="hidden sm:inline">Acciones</span>
              {hasWsNotification && (
                <span className="absolute -top-2 -right-2 text-xl animate-[spin_0.5s_linear_infinite] drop-shadow-md text-yellow-500" title="Nueva notificación">🔔</span>
              )}
            </button>

            {isActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-2xl border border-indigo-100 overflow-hidden z-50">
                <button
                  onClick={() => {
                    onOpenPrintSettings();
                    setIsActionsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-indigo-700 hover:bg-indigo-50 font-semibold"
                >
                  🖨️ Configurar impresión
                </button>
                <button
                  onClick={() => {
                    onOpenBlockchainModal();
                    setIsActionsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-indigo-700 hover:bg-indigo-50 font-semibold border-t border-gray-100 flex justify-between items-center"
                >
                  <span>🔗 Estado Blockchain</span>
                  {pendingBlockchainCount > 0 && (
                    <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                      {pendingBlockchainCount}
                    </span>
                  )}
                </button>
                {onOpenMetrics && (
                  <button
                    onClick={() => {
                      onOpenMetrics();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-amber-700 hover:bg-amber-50 font-semibold border-t border-gray-100"
                  >
                    📈 Metricas del negocio
                  </button>
                )}
                {onOpenBrebPanel && (
                  <button
                    onClick={() => {
                      onOpenBrebPanel();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-pink-700 hover:bg-pink-50 font-semibold border-t border-gray-100 flex justify-between items-center"
                  >
                    <span>📲 Transferencias Nequi</span>
                    {hasWsNotification && (
                      <span className="text-xl animate-[spin_0.5s_linear_infinite] drop-shadow-md text-yellow-500" title="Nueva transferencia">🔔</span>
                    )}
                  </button>
                )}
                {onOpenPrintMonitor && (
                  <button
                    onClick={() => {
                      onOpenPrintMonitor();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-violet-700 hover:bg-violet-50 font-semibold border-t border-gray-100"
                  >
                    🚦 Monitoreo impresión
                  </button>
                )}
                <button
                  onClick={() => {
                    onExportReport();
                    setIsActionsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-emerald-700 hover:bg-emerald-50 font-semibold border-t border-gray-100"
                >
                  📥 Exportar reporte
                </button>
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                  <div className="bg-white rounded-lg p-1">
                    <LogoutButton />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


