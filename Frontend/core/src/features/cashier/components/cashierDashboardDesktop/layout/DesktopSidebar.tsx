import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../../auth/authSlice';


interface DesktopSidebarProps {
  viewMode: 'tables' | 'urgent';
  setViewMode: (mode: 'tables' | 'urgent') => void;
  urgentOrdersCount: number;
  onExportReport: () => void;
  onOpenPrintSettings: () => void;
  onOpenBrebPanel?: () => void;
  onOpenMetrics: () => void;
  onOpenAttendanceModal: () => void;
  onOpenOrderSearch: () => void;
  onOpenWizard: () => void;
  onStartTutorial: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  viewMode,
  setViewMode,
  urgentOrdersCount,
  onExportReport,
  onOpenPrintSettings,
  onOpenBrebPanel,
  onOpenMetrics,
  onOpenAttendanceModal,
  onOpenOrderSearch,
  onOpenWizard,
  onStartTutorial,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Brand / Title */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl shadow-sm border border-emerald-200">
          💰
        </div>
        <div className="hidden md:block">
          <h1 className="font-bold text-lg text-slate-800 leading-tight">Caja</h1>
          <p className="text-xs text-slate-500 font-medium">Panel Principal</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="space-y-2 mb-8 tutorial-sidebar">
        <button
          onClick={() => setViewMode('tables')}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${
            viewMode === 'tables' 
              ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200' 
              : 'text-slate-600 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <span className="text-lg">🪑</span>
          <span className="hidden md:block">Vista por Mesas</span>
        </button>
        
        <button
          onClick={() => setViewMode('urgent')}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-semibold text-sm relative ${
            viewMode === 'urgent' 
              ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-200' 
              : 'text-slate-600 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <span className="text-lg">⚠️</span>
          <span className="hidden md:block">Cola Urgente</span>
          {urgentOrdersCount > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {urgentOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/cashier/take-order')}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-semibold text-sm bg-blue-50 text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-100 mt-2"
        >
          <span className="text-lg">📝</span>
          <span className="hidden md:block">Tomar Pedido</span>
        </button>
      </div>



      {/* Tools & Settings */}
      <div className="mt-auto hidden md:flex flex-col gap-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">Herramientas</h3>
        
        <button onClick={onOpenOrderSearch} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          <span>🔍</span> Buscar Orden
        </button>
        <button onClick={onOpenMetrics} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          <span>📊</span> Analíticas
        </button>
        <button onClick={onExportReport} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          <span>📄</span> Corte de Caja
        </button>
        <button onClick={onOpenAttendanceModal} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          <span>📓</span> Asistencia
        </button>
        {onOpenBrebPanel && (
          <button onClick={onOpenBrebPanel} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
            <span>🏦</span> BREB
          </button>
        )}
        <button onClick={onOpenPrintSettings} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors tutorial-settings">
          <span>🖨️</span> Impresoras
        </button>
        <button onClick={onOpenWizard} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          <span>⚙️</span> Asistente
        </button>
        <button onClick={onStartTutorial} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          <span>❓</span> Tutorial
        </button>
        <div className="h-px bg-slate-200 my-2 mx-2" />
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors">
          <span>🚪</span> Cerrar Sesión
        </button>
      </div>

      {/* User / Logout area (Mobile fallback) */}
      <div className="mt-auto md:hidden flex justify-center">
        <button onClick={onOpenMetrics} className="p-3 bg-slate-100 rounded-xl text-slate-600">
          📊
        </button>
      </div>
    </div>
  );
};
