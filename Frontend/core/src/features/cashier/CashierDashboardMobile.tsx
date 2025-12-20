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
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tables' | 'urgent'>('tables');

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
      <div className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-3xl flex-shrink-0">💰</span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold truncate">Caja</h1>
                <p className="text-sm opacity-90 truncate">{allOrders.length} órdenes activas</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
              <button
                onClick={() => setShowFilterModal(true)}
                className="relative p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
              >
                <span className="text-xl">🔍</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button
                onClick={onToggleStats}
                className="p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
              >
                <span className="text-xl">📊</span>
              </button>
              <button
                onClick={onOpenPrintSettings}
                className="p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
                title="Configurar impresión"
              >
                <span className="text-xl">🖨️</span>
              </button>
              <button
                onClick={onExportReport}
                className="p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
              >
                <span className="text-xl">📥</span>
              </button>
            </div>
          </div>

          {/* Botón de cerrar sesión - Nueva fila para mejor responsividad */}
          <div className="flex justify-end">
            <div className="bg-white bg-opacity-20 rounded-xl p-1">
              <LogoutButton />
            </div>
          </div>

          {/* Vista rápida de pendientes */}
          {pendingVerificationCount > 0 && (
            <div className="bg-red-500 bg-opacity-90 rounded-xl p-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <span className="font-bold">{pendingVerificationCount} pagos por verificar</span>
                </div>
                <button
                  onClick={() => setViewMode('urgent')}
                  className="px-3 py-1 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                >
                  Ver
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pestañas de modo de vista */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setViewMode('tables')}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
              viewMode === 'tables'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white bg-opacity-20 text-white'
            }`}
          >
            🪑 Por Mesas ({sortedTableNumbers.length})
          </button>
          <button
            onClick={() => setViewMode('urgent')}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
              viewMode === 'urgent'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white bg-opacity-20 text-white'
            }`}
          >
            ⚠️ Urgentes ({urgentOrders.length})
          </button>
        </div>
      </div>

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

