import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CashierMobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  quickTablesCount: number;
  pendingBlockchainCount: number;
  orderIdQuery: string;
  waiterQuery: string;
  onOpenOrderIdSearch: () => void;
  onOpenWaiterPicker: () => void;
  onToggleStats: () => void;
  onOpenQuickTablePicker: () => void;
  onOpenCashRegister: () => void;
  onOpenFilters: () => void;
  onOpenHistory: () => void;
  onOpenMetrics: () => void;
  onExportReport: () => void;
  onOpenPrintSettings: () => void;
  onOpenBlockchainModal: () => void;
  onOpenBrebPanel: () => void;
  onOpenLayoutEditor: () => void;
}

export const CashierMobileSidebar: React.FC<CashierMobileSidebarProps> = ({
  isOpen,
  onClose,
  quickTablesCount,
  pendingBlockchainCount,
  orderIdQuery,
  waiterQuery,
  onOpenOrderIdSearch,
  onOpenWaiterPicker,
  onToggleStats,
  onOpenQuickTablePicker,
  onOpenCashRegister,
  onOpenFilters,
  onOpenHistory,
  onOpenMetrics,
  onExportReport,
  onOpenPrintSettings,
  onOpenBlockchainModal,
  onOpenBrebPanel,
  onOpenLayoutEditor,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-[85%] max-w-sm bg-gray-50 z-[60] shadow-2xl transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white p-6 flex-shrink-0 relative overflow-hidden shadow-md">
          <div className="absolute -top-4 -right-4 p-4 opacity-10 transform rotate-12">
            <span className="text-9xl">⚙️</span>
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black mb-1">Herramientas</h2>
              <p className="text-sm text-indigo-200">Gestión de Caja y Opciones</p>
            </div>
            <button 
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <section>
            <h3 className="px-2 mb-3 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 border-t-2 border-gray-300"></span>
              Búsqueda y Vistas
            </h3>
            <div className="space-y-1">
              <SidebarItem icon="🔍" text="Buscar por Orden" onClick={() => { onOpenOrderIdSearch(); onClose(); }} isActive={!!orderIdQuery} />
              <SidebarItem icon="👤" text="Buscar por Mesero" onClick={() => { onOpenWaiterPicker(); onClose(); }} isActive={!!waiterQuery} />
              <SidebarItem icon="📊" text="Ver Estadísticas Rápidas" onClick={() => { onToggleStats(); onClose(); }} />
            </div>
          </section>

          <section>
            <h3 className="px-2 mb-3 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 border-t-2 border-gray-300"></span>
              Operaciones
            </h3>
            <div className="space-y-1">
              <SidebarItem icon="🏪" text="Control de Caja" onClick={() => { onOpenCashRegister(); onClose(); }} customColor="text-emerald-700 hover:bg-emerald-50" iconBg="bg-emerald-100" />
              <SidebarItem icon="🪑" text="Mesas Activas" badge={quickTablesCount} onClick={() => { onOpenQuickTablePicker(); onClose(); }} customColor="text-blue-700 hover:bg-blue-50" iconBg="bg-blue-100" />
              <SidebarItem icon="📝" text="Tomar Comanda" onClick={() => { navigate('/cashier/take-order'); onClose(); }} customColor="text-teal-700 hover:bg-teal-50" iconBg="bg-teal-100" />
              <SidebarItem icon="📱" text="Notificaciones BREB" onClick={() => { onOpenBrebPanel(); onClose(); }} customColor="text-indigo-700 hover:bg-indigo-50" iconBg="bg-indigo-100" />
              <SidebarItem icon="🗺️" text="Editar Plano de Mesas" onClick={() => { onOpenLayoutEditor(); onClose(); }} customColor="text-amber-700 hover:bg-amber-50" iconBg="bg-amber-100" />
            </div>
          </section>

          <section>
            <h3 className="px-2 mb-3 text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 border-t-2 border-gray-300"></span>
              Avanzado
            </h3>
            <div className="space-y-1">
              <SidebarItem icon="⚙️" text="Ajustes de Impresión" onClick={() => { onOpenPrintSettings(); onClose(); }} />
              <SidebarItem icon="🔧" text="Filtros Avanzados" onClick={() => { onOpenFilters(); onClose(); }} />
              <SidebarItem icon="🧾" text="Historial Facturas" onClick={() => { onOpenHistory(); onClose(); }} />
              <SidebarItem icon="📥" text="Exportar Reporte" onClick={() => { onExportReport(); onClose(); }} />
              <SidebarItem icon="⛓️" text="Panel de Blockchain" badge={pendingBlockchainCount} onClick={() => { onOpenBlockchainModal(); onClose(); }} customColor="text-amber-700 hover:bg-amber-50" iconBg="bg-amber-100" />
              <SidebarItem icon="📈" text="Métricas del Sistema" onClick={() => { onOpenMetrics(); onClose(); }} />
            </div>
          </section>
        </div>

        <div className="bg-white p-4 flex-shrink-0 border-t border-gray-200">
          <p className="text-center text-xs text-gray-400 font-semibold">TurnyChain OS Mobile v1.0</p>
        </div>
      </div>
    </>
  );
};

const SidebarItem = ({ 
  icon, 
  text, 
  onClick, 
  isActive = false, 
  badge,
  customColor = "text-gray-700 hover:bg-gray-100",
  iconBg = "bg-white"
}: { 
  icon: React.ReactNode, 
  text: string, 
  onClick: () => void, 
  isActive?: boolean, 
  badge?: number,
  customColor?: string,
  iconBg?: string
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 ${
      isActive 
        ? 'bg-purple-100 text-purple-900 font-bold shadow-sm' 
        : `font-semibold ${customColor}`
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-white shadow-sm' : iconBg} shadow-sm border border-black/5`}>
        <span className="text-lg">{icon}</span>
      </div>
      <span className="text-[15px]">{text}</span>
    </div>
    {isActive && (
      <span className="bg-purple-500 w-2 h-2 rounded-full"></span>
    )}
    {badge !== undefined && badge > 0 && (
      <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-black shadow-sm">
        {badge}
      </span>
    )}
  </button>
);
