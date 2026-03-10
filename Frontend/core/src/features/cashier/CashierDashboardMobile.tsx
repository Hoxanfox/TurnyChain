// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboardMobile.tsx
// =================================================================
import React, { useState } from 'react';
import type { Order } from '../../types/orders';
import { FilterModal } from './components/FilterModal';
import type { FilterStatus, PaymentMethodFilter, SortBy } from './components/CashierFilters';
import { StatisticsCard } from './components/StatisticsCard';
import { TableCard } from './components/TableCard';
import { TableOrdersModal } from './components/TableOrdersModal';
import { QuickActionsBar } from './components/QuickActionsBar';
import { Notification } from '../../components/Notification';
import LogoutButton from '../../components/LogoutButton';
import OrderDetailModal from '../shared/orders/components/OrderDetailModal';

interface CashierStatistics {
  totalPaid: number;
  totalPending: number;
  totalVerification: number;
  totalDelivered: number;
  cashTotal: number;
  transferTotal: number;
  ordersCount: number;
  averageOrderValue: number;
  // Analíticas diarias
  dailyRevenue: number;
  dailyCash: number;
  dailyTransfer: number;
  dailyOrdersCount: number;
  dailyAverageTicket: number;
}

interface CashierDashboardMobileProps {
  // Estado
  showStats: boolean;
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  sortBy: SortBy;

  // Datos
  statistics: CashierStatistics;
  ordersByTable: Record<number, Order[]>;
  pendingVerificationCount: number;
  isLoading: boolean;

  // Notificaciones
  notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null;

  // Handlers
  onToggleStats: () => void;
  onFilterStatusChange: (status: FilterStatus) => void;
  onPaymentMethodFilterChange: (method: PaymentMethodFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onClearFilters: () => void;
  onExportReport: () => void;
  onOpenPrintSettings: () => void;
  onCloseNotification: () => void;
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onPrintCommand: (orderId: string) => void;
  onPrintFullCommand: (orderId: string) => void;
  onPreviewTickets: (orderId: string) => void;
}

export const CashierDashboardMobile: React.FC<CashierDashboardMobileProps> = ({
  showStats,
  filterStatus,
  paymentMethodFilter,
  searchQuery,
  sortBy,
  statistics,
  ordersByTable,
  pendingVerificationCount,
  isLoading,
  notification,
  onToggleStats,
  onFilterStatusChange,
  onPaymentMethodFilterChange,
  onSearchQueryChange,
  onSortByChange,
  onClearFilters,
  onExportReport,
  onOpenPrintSettings,
  onCloseNotification,
  onStatusChange,
  onConfirmPayment,
  onRejectPayment,
  onPrintCommand,
  onPrintFullCommand,
  onPreviewTickets,
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tables' | 'urgent'>('tables');
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Obtener todas las órdenes
  const allOrders = Object.values(ordersByTable).flat();

  // Órdenes por categoría
  const urgentOrders = allOrders.filter(o => o.status === 'por_verificar');
  const deliveredOrders = allOrders.filter(o => o.status === 'entregado');
  const paidOrders = allOrders.filter(o => o.status === 'pagado');

  // Datos para StatisticsCard
  const statsForCard = {
    totalOrders: statistics.ordersCount,
    totalRevenue: statistics.totalPaid,
    pendingPayments: pendingVerificationCount,
    verifiedPayments: paidOrders.length,
    cashPayments: allOrders.filter((o) => o.payment_method === 'efectivo').length,
    transferPayments: allOrders.filter((o) => o.payment_method === 'transferencia').length,
    averageOrderValue: statistics.averageOrderValue,
    // Analíticas diarias
    dailyRevenue: statistics.dailyRevenue,
    dailyCash: statistics.dailyCash,
    dailyTransfer: statistics.dailyTransfer,
    dailyOrdersCount: statistics.dailyOrdersCount,
    dailyAverageTicket: statistics.dailyAverageTicket,
  };

  // Calcular filtros activos
  const activeFiltersCount = [
    filterStatus !== 'all',
    paymentMethodFilter !== 'all',
    searchQuery.trim() !== '',
  ].filter(Boolean).length;

  // Ordenar mesas (tablas con órdenes por verificar primero)
  const sortedTableNumbers = Object.keys(ordersByTable)
    .map(Number)
    .sort((a, b) => {
      const aHasUrgent = ordersByTable[a].some(o => o.status === 'por_verificar');
      const bHasUrgent = ordersByTable[b].some(o => o.status === 'por_verificar');
      if (aHasUrgent && !bHasUrgent) return -1;
      if (!aHasUrgent && bHasUrgent) return 1;
      return a - b;
    });

  const handleQuickFilterByStatus = (status: 'por_verificar' | 'entregado' | 'pagado') => {
    onFilterStatusChange(status);
    setViewMode('tables');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-24">
      {/* Notificaciones */}
      {notification && (
        <Notification
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={onCloseNotification}
        />
      )}

      {/* Header fijo */}
      <div className="sticky top-0 z-40 shadow-lg" style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 40%, #4f46e5 100%)' }}>
        <div className="px-4 pt-4 pb-3">
          {/* Fila principal: título + botón menú */}
          <div className="flex items-center justify-between gap-3">
            {/* Lado izquierdo: icono + título */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💰</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-white">Caja</h1>
                <p className="text-xs text-purple-200">
                  {allOrders.length} órdenes activas
                </p>
              </div>
            </div>

            {/* Botón menú — fondo blanco sólido con texto oscuro */}
            <button
              onClick={() => setShowActionMenu(true)}
              className="relative flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-md active:scale-95 transition-all flex-shrink-0"
            >
              {(activeFiltersCount > 0 || pendingVerificationCount > 0) && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                  {activeFiltersCount + (pendingVerificationCount > 0 ? 1 : 0)}
                </span>
              )}
              <span className="text-sm font-semibold text-purple-700">Menú</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Alerta de pagos pendientes */}
          {pendingVerificationCount > 0 && (
            <div className="mt-3 bg-red-500 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span className="font-semibold text-sm text-white">{pendingVerificationCount} pagos por verificar</span>
              </div>
              <button
                onClick={() => setViewMode('urgent')}
                className="px-3 py-1 bg-white text-red-600 rounded-lg text-xs font-bold shadow active:scale-95 transition-all"
              >
                Ver →
              </button>
            </div>
          )}
        </div>

        {/* Pestañas de modo de vista */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setViewMode('tables')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              viewMode === 'tables'
                ? 'bg-white text-purple-700 shadow-lg'
                : 'bg-purple-800 bg-opacity-60 text-purple-100 border border-purple-400 border-opacity-30'
            }`}
          >
            🪑 Mesas ({sortedTableNumbers.length})
          </button>
          <button
            onClick={() => setViewMode('urgent')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              viewMode === 'urgent'
                ? 'bg-white text-purple-700 shadow-lg'
                : 'bg-purple-800 bg-opacity-60 text-purple-100 border border-purple-400 border-opacity-30'
            }`}
          >
            ⚠️ Urgentes ({urgentOrders.length})
          </button>
        </div>
      </div>

      {/* === MENÚ DESPLEGABLE (Bottom Sheet) === */}
      {showActionMenu && (
        <>
          {/* Overlay difuminado para cerrar al tocar fuera */}
          <div
            className="fixed inset-0 z-50 backdrop-blur-sm bg-black bg-opacity-20"
            onClick={() => setShowActionMenu(false)}
          />

          {/* Panel inferior */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl safe-area-pb animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Título del menú */}
            <div className="px-6 py-3 border-b border-gray-100">
              <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">Opciones</p>
            </div>

            {/* Acciones */}
            <div className="px-4 py-3 space-y-2">
              {/* Filtros */}
              <button
                onClick={() => { setShowActionMenu(false); setShowFilterModal(true); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-purple-50 hover:bg-purple-100 active:scale-98 transition-all"
              >
                <span className="text-2xl w-8 text-center">🔍</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">Buscar y Filtrar</p>
                  <p className="text-xs text-gray-500">Filtra por estado, método de pago y más</p>
                </div>
                {activeFiltersCount > 0 && (
                  <span className="bg-purple-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Estadísticas */}
              <button
                onClick={() => { setShowActionMenu(false); onToggleStats(); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-blue-50 hover:bg-blue-100 active:scale-98 transition-all"
              >
                <span className="text-2xl w-8 text-center">📊</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">{showStats ? 'Ocultar' : 'Mostrar'} Estadísticas</p>
                  <p className="text-xs text-gray-500">Resumen de ingresos y órdenes del día</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${showStats ? 'bg-blue-500' : 'bg-gray-300'}`} />
              </button>

              {/* Impresión */}
              <button
                onClick={() => { setShowActionMenu(false); onOpenPrintSettings(); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 active:scale-98 transition-all"
              >
                <span className="text-2xl w-8 text-center">🖨️</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">Configurar Impresión</p>
                  <p className="text-xs text-gray-500">Ajusta impresoras y formato de comandas</p>
                </div>
              </button>

              {/* Exportar */}
              <button
                onClick={() => { setShowActionMenu(false); onExportReport(); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-green-50 hover:bg-green-100 active:scale-98 transition-all"
              >
                <span className="text-2xl w-8 text-center">📥</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">Exportar Reporte</p>
                  <p className="text-xs text-gray-500">Descarga el reporte en formato CSV</p>
                </div>
              </button>

              {/* Cerrar sesión */}
              <div className="px-4 py-3 rounded-2xl bg-red-50 flex items-center gap-4">
                <span className="text-2xl w-8 text-center">🚪</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">Cerrar Sesión</p>
                  <p className="text-xs text-gray-500">Salir de tu cuenta actual</p>
                </div>
                <LogoutButton />
              </div>
            </div>

            {/* Botón cancelar */}
            <div className="px-4 pb-6 pt-1">
              <button
                onClick={() => setShowActionMenu(false)}
                className="w-full py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Estadísticas */}
      {showStats && (
        <div className="p-4">
          <StatisticsCard stats={statsForCard} />
        </div>
      )}

      {/* Contenido principal */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">⏳</div>
              <p className="text-gray-500 text-lg">Cargando órdenes...</p>
            </div>
          </div>
        ) : viewMode === 'tables' ? (
          // Vista por mesas
          <>
            {sortedTableNumbers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <p className="text-6xl mb-4">📭</p>
                <p className="text-gray-500 text-xl font-semibold">No hay mesas con órdenes activas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedTableNumbers.map(tableNum => (
                  <TableCard
                    key={tableNum}
                    tableNumber={tableNum}
                    orders={ordersByTable[tableNum]}
                    onViewOrders={setSelectedTableNumber}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          // Vista de urgentes
          <>
            {urgentOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <p className="text-6xl mb-4">✅</p>
                <p className="text-gray-500 text-xl font-semibold">No hay pagos por verificar</p>
                <p className="text-gray-400 mt-2">¡Excelente trabajo!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {urgentOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-lg p-4 border-2 border-orange-300">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🪑</span>
                          <h3 className="text-xl font-bold">Mesa {order.table_number}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Orden #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">Mesero: {order.waiter_name || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">${order.total.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{order.payment_method}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onConfirmPayment(order.id)}
                        className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-md transition-all"
                      >
                        ✓ Confirmar Pago
                      </button>
                      <button
                        onClick={() => onRejectPayment(order.id)}
                        className="px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-md transition-all"
                      >
                        ✕ Rechazar
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedOrderIdForDetail(order.id)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <span className="text-lg">📋</span>
                      <span>Ver Detalle</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Barra de acciones rápidas */}
      <QuickActionsBar
        pendingCount={urgentOrders.length}
        deliveredCount={deliveredOrders.length}
        paidCount={paidOrders.length}
        onFilterByStatus={handleQuickFilterByStatus}
      />

      {/* Modal de filtros */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filterStatus}
        paymentMethodFilter={paymentMethodFilter}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onFilterStatusChange={onFilterStatusChange}
        onPaymentMethodFilterChange={onPaymentMethodFilterChange}
        onSearchQueryChange={onSearchQueryChange}
        onSortByChange={onSortByChange}
        onClearFilters={onClearFilters}
      />

      {/* Modal de órdenes de mesa */}
      <TableOrdersModal
        isOpen={selectedTableNumber !== null}
        onClose={() => setSelectedTableNumber(null)}
        tableNumber={selectedTableNumber}
        orders={selectedTableNumber ? ordersByTable[selectedTableNumber] || [] : []}
        onStatusChange={onStatusChange}
        onConfirmPayment={onConfirmPayment}
        onRejectPayment={onRejectPayment}
        onViewDetail={(orderId) => setSelectedOrderIdForDetail(orderId)}
        onPrintCommand={onPrintCommand}
        onPrintFullCommand={onPrintFullCommand}
        onPreviewTickets={onPreviewTickets}
      />

      {/* Modal de Detalle de Orden */}
      {selectedOrderIdForDetail && (
        <OrderDetailModal
          orderId={selectedOrderIdForDetail}
          onClose={() => setSelectedOrderIdForDetail(null)}
          editable={false}
        />
      )}
    </div>
  );
};

