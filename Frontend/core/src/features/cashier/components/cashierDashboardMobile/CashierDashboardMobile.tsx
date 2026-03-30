// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboardMobile.tsx
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../../../../types/orders';
import { FilterModal } from '../cashierDashboardShared/FilterModal';
import type { FilterStatus, PaymentMethodFilter, SortBy } from '../cashierDashboardShared/CashierFilters';
import { StatisticsCard } from '../cashierDashboardShared/StatisticsCard';
import { TableCard } from '../cashierDashboardShared/TableCard';
import { TableOrdersModal } from '../cashierDashboardShared/TableOrdersModal';
import { QuickActionsBar } from '../cashierDashboardShared/QuickActionsBar';
import { OrderIdSearchModal } from '../cashierDashboardShared/OrderIdSearchModal';
import { WaiterPickerModal } from '../cashierDashboardShared/WaiterPickerModal';
import { QuickTablePickerModal } from '../cashierDashboardShared/QuickTablePickerModal';
import type { CashierNotification, CashierStatistics } from '../../types/cashierDashboardTypes';
import { Notification } from '../../../../components/Notification';
import LogoutButton from '../../../../components/LogoutButton';
import OrderDetailModal from '../../../shared/orders/components/OrderDetailModal';

interface CashierDashboardMobileProps {
  // Estado
  showStats: boolean;
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  waiterQuery: string;
  orderIdQuery: string;
  sortBy: SortBy;

  // Datos
  statistics: CashierStatistics;
  ordersByTable: Record<number, Order[]>;
  pendingVerificationCount: number;
  isLoading: boolean;
  hasFailed?: boolean;

  // Notificaciones
  notification: CashierNotification | null;

  // Handlers
  onToggleStats: () => void;
  onFilterStatusChange: (status: FilterStatus) => void;
  onPaymentMethodFilterChange: (method: PaymentMethodFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onWaiterQueryChange: (query: string) => void;
  onOrderIdQueryChange: (query: string) => void;
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
  onOpenCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onOpenCheckoutGroup: (orderIds: string[], total: number, tableNumber: number) => void;
  onRetryPrint: (orderId: string) => void;
  onRetryLoadOrders?: () => void;
  shortcutTarget?: { tableNumber: number; orderId: string } | null;
  shortcutNonce?: number;
}

export const CashierDashboardMobile: React.FC<CashierDashboardMobileProps> = ({
  showStats,
  filterStatus,
  paymentMethodFilter,
  searchQuery,
  waiterQuery,
  orderIdQuery,
  sortBy,
  statistics,
  ordersByTable,
  pendingVerificationCount,
  isLoading,
  hasFailed,
  notification,
  onToggleStats,
  onFilterStatusChange,
  onPaymentMethodFilterChange,
  onSearchQueryChange,
  onWaiterQueryChange,
  onOrderIdQueryChange,
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
  onOpenCheckout,
  onOpenCheckoutGroup,
  onRetryPrint,
  onRetryLoadOrders,
  shortcutTarget = null,
  shortcutNonce = 0,
}) => {
  const navigate = useNavigate();
  const isPorCobrarStatus = (status: string) => status === 'entregado' || status === 'pendiente_aprobacion';

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showOrderIdModal, setShowOrderIdModal] = useState(false);
  const [showWaiterPicker, setShowWaiterPicker] = useState(false);
  const [showQuickTablePicker, setShowQuickTablePicker] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tables' | 'urgent'>('tables');

  useEffect(() => {
    if (!shortcutTarget || shortcutNonce === 0) return;
    setViewMode('tables');
    setSelectedTableNumber(shortcutTarget.tableNumber);
    setFocusedOrderId(shortcutTarget.orderId);
  }, [shortcutNonce, shortcutTarget]);

  // Obtener todas las órdenes
  const allOrders = Object.values(ordersByTable).flat();
  const waiterOptions = useMemo(() => {
    const waiterMap = new Map<string, { ordersCount: number; tables: Set<number> }>();

    allOrders.forEach((order) => {
      const waiterName = (order.waiter_name || '').trim();
      if (!waiterName) return;

      const current = waiterMap.get(waiterName) || { ordersCount: 0, tables: new Set<number>() };
      current.ordersCount += 1;
      current.tables.add(order.table_number);
      waiterMap.set(waiterName, current);
    });

    return Array.from(waiterMap.entries())
      .map(([name, value]) => ({
        name,
        ordersCount: value.ordersCount,
        tablesCount: value.tables.size,
      }))
      .sort((a, b) => b.ordersCount - a.ordersCount || a.name.localeCompare(b.name));
  }, [allOrders]);

  // Órdenes por categoría
  const urgentOrders = allOrders.filter(o => o.status === 'por_verificar');
  const deliveredOrders = allOrders.filter(o => isPorCobrarStatus(o.status));
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
                onClick={() => setShowQuickTablePicker(true)}
                className="relative p-2.5 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
                title="Seleccion rapida de mesa"
              >
                <span className="text-xl">🪑</span>
                {sortedTableNumbers.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {sortedTableNumbers.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowOrderIdModal(true)}
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
                onClick={() => setShowWaiterPicker(true)}
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
                        setShowFilterModal(true);
                        setIsActionsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-blue-700 hover:bg-blue-50 font-semibold border-t border-gray-100"
                    >
                      🔧 Filtros avanzados
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600 text-lg">Cargando órdenes...</p>
            </div>
          </div>
        ) : hasFailed ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold text-lg">Error al cargar las órdenes</p>
              <p className="text-gray-500 text-sm mt-1">Verifica tu conexión o intenta nuevamente</p>
              {onRetryLoadOrders && (
                <button
                  onClick={onRetryLoadOrders}
                  className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  🔄 Reintentar
                </button>
              )}
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

      <OrderIdSearchModal
        isOpen={showOrderIdModal}
        value={orderIdQuery}
        onChange={onOrderIdQueryChange}
        onSubmit={(value) => {
          const normalized = value.trim();
          if (!normalized) return;
          setShowOrderIdModal(false);
          onOrderIdQueryChange('');
          navigate(`/cashier/search/${encodeURIComponent(normalized)}`);
        }}
        onClose={() => setShowOrderIdModal(false)}
      />

      <WaiterPickerModal
        isOpen={showWaiterPicker}
        waiters={waiterOptions}
        selectedWaiter={waiterQuery}
        onSelectWaiter={(waiterName) => {
          const normalized = waiterName.trim();
          if (!normalized) return;
          onWaiterQueryChange(normalized);
          navigate(`/cashier/search/waiter/${encodeURIComponent(normalized)}`);
        }}
        onClear={() => onWaiterQueryChange('')}
        onClose={() => setShowWaiterPicker(false)}
      />

      <QuickTablePickerModal
        isOpen={showQuickTablePicker}
        tableNumbers={sortedTableNumbers}
        selectedTable={selectedTableNumber}
        onSelectTable={(tableNumber) => {
          setViewMode('tables');
          setFocusedOrderId(null);
          setSelectedTableNumber(tableNumber);
        }}
        onClose={() => setShowQuickTablePicker(false)}
      />

      {/* Modal de órdenes de mesa */}
      <TableOrdersModal
        isOpen={selectedTableNumber !== null}
        onClose={() => {
          setSelectedTableNumber(null);
          setFocusedOrderId(null);
        }}
        tableNumber={selectedTableNumber}
        orders={selectedTableNumber ? ordersByTable[selectedTableNumber] || [] : []}
        highlightOrderId={focusedOrderId}
        onStatusChange={onStatusChange}
        onConfirmPayment={onConfirmPayment}
        onRejectPayment={onRejectPayment}
        onViewDetail={(orderId) => setSelectedOrderIdForDetail(orderId)}
        onPrintCommand={onPrintCommand}
        onPrintFullCommand={onPrintFullCommand}
        onPreviewTickets={onPreviewTickets}
        onOpenCheckout={onOpenCheckout}
        onOpenCheckoutGroup={onOpenCheckoutGroup}
        onRetryPrint={onRetryPrint}
        onCancelOrder={(orderId) => onStatusChange(orderId, 'cancelado')}
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

