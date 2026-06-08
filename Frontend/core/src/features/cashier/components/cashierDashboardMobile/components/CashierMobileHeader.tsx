import React, { useState } from 'react';
import LogoutButton from '../../../../../components/LogoutButton';

interface CashierMobileHeaderProps {
  activeOrdersCount: number;
  quickTablesCount: number;
  orderIdQuery: string;
  waiterQuery: string;
  pendingVerificationCount: number;
  onOpenQuickTablePicker: () => void;
  onOpenOrderIdSearch: () => void;
  onOpenWaiterPicker: () => void;
  onToggleStats: () => void;
  onOpenPrintSettings: () => void;
  onOpenFilters: () => void;
  onOpenHistory: () => void;
  onOpenMetrics: () => void;
  onExportReport: () => void;
  onViewUrgent: () => void;
  isCajaAbierta: boolean;
  onOpenCierreCaja: () => void;
  onOpenAperturaCaja: () => void;
  onOpenGastoModal: () => void;
}

export const CashierMobileHeader: React.FC<CashierMobileHeaderProps> = ({
  activeOrdersCount,
  quickTablesCount,
  orderIdQuery,
  waiterQuery,
  pendingVerificationCount,
  onOpenQuickTablePicker,
  onOpenOrderIdSearch,
  onOpenWaiterPicker,
  onToggleStats,
  onOpenPrintSettings,
  onOpenFilters,
  onOpenHistory,
  onOpenMetrics,
  onExportReport,
  onViewUrgent,
  isCajaAbierta,
  onOpenCierreCaja,
  onOpenAperturaCaja,
  onOpenGastoModal,
}) => {
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-3xl flex-shrink-0">💰</span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">Caja</h1>
              <p className="text-sm opacity-90 truncate">{activeOrdersCount} ordenes activas</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <button
              onClick={onOpenQuickTablePicker}
              className="relative p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
              title="Seleccion rapida de mesa"
            >
              <span className="text-xl">🪑</span>
              {quickTablesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {quickTablesCount}
                </span>
              )}
            </button>
            <button
              onClick={onOpenOrderIdSearch}
              className="relative p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
            >
              <span className="text-xl">🔍</span>
              {orderIdQuery.trim() && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
            <button
              onClick={onOpenWaiterPicker}
              className="relative p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
              title="Buscar por mesero"
            >
              <span className="text-xl">👤</span>
              {waiterQuery.trim() && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
            <button
              onClick={onToggleStats}
              className="p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
            >
              <span className="text-xl">📊</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                className="p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
                title="Abrir acciones"
              >
                <span className="text-xl">☰</span>
              </button>

              {isActionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-2xl border border-indigo-100 overflow-hidden z-50">
                  {isCajaAbierta ? (
                    <>
                      <button
                        onClick={() => {
                          onOpenGastoModal();
                          setIsActionsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-amber-700 hover:bg-amber-50 font-semibold flex items-center gap-2 border-b border-gray-100"
                      >
                        💸 Registrar Gasto
                      </button>
                      <button
                        onClick={() => {
                          onOpenCierreCaja();
                          setIsActionsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-semibold flex items-center gap-2 border-b border-gray-100"
                      >
                        🔒 Cierre de Caja
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        onOpenAperturaCaja();
                        setIsActionsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-emerald-600 hover:bg-emerald-50 font-semibold flex items-center gap-2 border-b border-gray-100"
                    >
                      🔑 Abrir Caja
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onOpenPrintSettings();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-indigo-700 hover:bg-indigo-50 font-semibold"
                  >
                    🖨️ Configurar impresion
                  </button>
                  <button
                    onClick={() => {
                      onOpenFilters();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-blue-700 hover:bg-blue-50 font-semibold border-t border-gray-100"
                  >
                    🔧 Filtros avanzados
                  </button>
                  <button
                    onClick={() => {
                      onOpenHistory();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-purple-700 hover:bg-purple-50 font-semibold border-t border-gray-100"
                  >
                    🧾 Historial facturas
                  </button>
                  <button
                    onClick={() => {
                      onOpenMetrics();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-amber-700 hover:bg-amber-50 font-semibold border-t border-gray-100"
                  >
                    📈 Metricas del negocio
                  </button>
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

        {pendingVerificationCount > 0 && (
          <div className="bg-red-500 bg-opacity-90 rounded-xl p-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <span className="font-bold">{pendingVerificationCount} pagos por verificar</span>
              </div>
              <button
                onClick={onViewUrgent}
                className="px-3 py-1 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                Ver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
