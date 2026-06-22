import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../../../../../components/LogoutButton';

interface CashierMobileHeaderProps {
  activeOrdersCount: number;
  quickTablesCount: number;
  orderIdQuery: string;
  waiterQuery: string;
  pendingVerificationCount: number;
  pendingBlockchainCount: number;
  onOpenQuickTablePicker: () => void;
  onOpenOrderIdSearch: () => void;
  onOpenWaiterPicker: () => void;
  onToggleStats: () => void;
  onOpenPrintSettings: () => void;
  onOpenBlockchainModal: () => void;
  onOpenFilters: () => void;
  onOpenHistory: () => void;
  onOpenMetrics: () => void;
  onExportReport: () => void;
  onViewUrgent: () => void;
  onOpenCashRegister: () => void;
}

export const CashierMobileHeader: React.FC<CashierMobileHeaderProps> = ({
  activeOrdersCount,
  quickTablesCount,
  orderIdQuery,
  waiterQuery,
  pendingVerificationCount,
  pendingBlockchainCount,
  onOpenQuickTablePicker,
  onOpenOrderIdSearch,
  onOpenWaiterPicker,
  onToggleStats,
  onOpenPrintSettings,
  onOpenBlockchainModal,
  onOpenFilters,
  onOpenHistory,
  onOpenMetrics,
  onExportReport,
  onViewUrgent,
  onOpenCashRegister,
}) => {
  const navigate = useNavigate();
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
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end items-center">
            <div className="relative">
              <button
                onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                className="p-3 min-w-[48px] min-h-[48px] justify-center bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all flex items-center gap-1 active:scale-95"
                title="Abrir acciones"
              >
                <span className="text-xl">☰</span>
                {(orderIdQuery.trim() || waiterQuery.trim()) && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              {isActionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-2xl border border-indigo-100 overflow-hidden z-50">
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Búsquedas y Filtros</p>
                  </div>
                  <button
                    onClick={() => {
                      onOpenOrderIdSearch();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 font-semibold flex justify-between items-center"
                  >
                    <span>🔍 Buscar por Orden</span>
                    {orderIdQuery.trim() && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">Activo</span>}
                  </button>
                  <button
                    onClick={() => {
                      onOpenWaiterPicker();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 font-semibold border-t border-gray-100 flex justify-between items-center"
                  >
                    <span>👤 Buscar por Mesero</span>
                    {waiterQuery.trim() && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">Activo</span>}
                  </button>
                  <button
                    onClick={() => {
                      onToggleStats();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 font-semibold border-t border-gray-100"
                  >
                    <span>📊 Ver Estadísticas Rápidas</span>
                  </button>
                  
                  <div className="bg-gray-50 border-y border-gray-200 px-3 py-2 mt-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Herramientas</p>
                  </div>
                  <button
                    onClick={() => {
                      onOpenCashRegister();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-green-700 hover:bg-green-50 font-semibold border-b border-gray-100 flex justify-between items-center"
                  >
                    <span>🏪 Control de Caja</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenQuickTablePicker();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-blue-700 hover:bg-blue-50 font-semibold border-b border-gray-100 flex justify-between items-center"
                  >
                    <span>🪑 Mesas</span>
                    {quickTablesCount > 0 && (
                      <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{quickTablesCount}</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      navigate('/cashier/take-order');
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-emerald-700 hover:bg-emerald-50 font-semibold border-b border-gray-100"
                  >
                    📝 Tomar Comanda
                  </button>
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
                      onOpenBlockchainModal();
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-indigo-700 hover:bg-indigo-50 font-semibold border-t border-gray-100 flex justify-between items-center"
                  >
                    <span>🔗 Estado Blockchain</span>
                    {pendingBlockchainCount > 0 && (
                      <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingBlockchainCount}</span>
                    )}
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
