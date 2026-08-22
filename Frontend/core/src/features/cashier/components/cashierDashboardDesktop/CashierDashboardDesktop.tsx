// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboardDesktop.tsx
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../../../../types/orders';
import { CashierHeader } from '../cashierDashboardShared/CashierHeader';
import { CashierFilters } from '../cashierDashboardShared/CashierFilters';
import type { FilterStatus, PaymentMethodFilter, SortBy } from '../cashierDashboardShared/CashierFilters';
import { StatisticsCard } from '../cashierDashboardShared/StatisticsCard';
import { CinemaTablesSelector } from '../cashierDashboardShared/CinemaTablesSelector';
import { getOrderPaymentCategory } from '../../hooks/useCashierLogic';
import { OrderIdSearchModal } from '../cashierDashboardShared/OrderIdSearchModal';
import { WaiterPickerModal } from '../cashierDashboardShared/WaiterPickerModal';
import { QuickTablePickerModal } from '../cashierDashboardShared/QuickTablePickerModal';
import { OrdersPanel } from '../cashierDashboardShared/OrdersPanel';
import { TableOrdersModal } from '../cashierDashboardShared/TableOrdersModal';
import { QuickProofView } from '../cashierDashboardShared/QuickProofView';
import type { CashierNotification, CashierStatistics } from '../../types/cashierDashboardTypes';
import { Notification } from '../../../../components/Notification';
import OrderDetailModal from '../../../shared/orders/components/OrderDetailModal';
import { AttendanceNotebookModal } from '../cashierDashboardShared/AttendanceNotebookModal';

interface CashierDashboardDesktopProps {
  // Estado
  showStats: boolean;
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  waiterQuery: string;
  orderIdQuery: string;
  sortBy: SortBy;
  selectedTable: number | null;

  // Datos
  statistics: CashierStatistics;
  ordersByTable: Record<number, Order[]>;
  sortedSelectedOrders: Order[];
  pendingVerificationCount: number;
  pendingBlockchainCount: number;
  isLoading: boolean;
  hasFailed: boolean;

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
  onOpenBlockchainModal: () => void;
  onOpenBrebPanel?: () => void;
  onCloseNotification: () => void;
  onSelectTable: (tableNumber: number) => void;
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onPrintCommand: (orderId: string) => void;
  onPrintFullCommand: (orderId: string) => void;
  onPreviewTickets: (orderId: string) => void;
  onOpenCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onOpenCheckoutGroup: (ordersInfo: { id: string, total: number }[], total: number, tableNumber: number) => void;
  onRetryPrint: (orderId: string) => void;
  onViewProof: () => void;
  onRetryLoadOrders: () => void;
  shortcutTarget?: { tableNumber: number; orderId: string } | null;
  shortcutNonce?: number;
  hasWsNotification?: boolean;
}

export const CashierDashboardDesktop: React.FC<CashierDashboardDesktopProps> = ({
  showStats,
  filterStatus,
  paymentMethodFilter,
  searchQuery,
  waiterQuery,
  orderIdQuery,
  sortBy,
  selectedTable,
  statistics,
  ordersByTable,
  sortedSelectedOrders,
  pendingVerificationCount,
  pendingBlockchainCount,
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
  onOpenBlockchainModal,
  onOpenBrebPanel,
  onCloseNotification,
  onSelectTable,
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
  hasWsNotification = false,
}) => {
  const navigate = useNavigate();
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tables' | 'urgent'>('tables');
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isOrderSearchModalOpen, setIsOrderSearchModalOpen] = useState(false);
  const [isWaiterPickerOpen, setIsWaiterPickerOpen] = useState(false);
  const [isQuickTablePickerOpen, setIsQuickTablePickerOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [openPrintMonitorSignal, setOpenPrintMonitorSignal] = useState(0);

  const isPorCobrarStatus = (status: string) => status === 'entregado' || status === 'pendiente_aprobacion';
  const isPayableStatus = (status: string) => status === 'por_verificar' || isPorCobrarStatus(status);

  // Datos para CashierFilters
  const allOrders = Object.values(ordersByTable).flat();
  const totalOrders = allOrders.length;
  const cashPayments = allOrders.filter((o) => o.status === 'pagado' && getOrderPaymentCategory(o) === 'efectivo').length;
  const transferPayments = allOrders.filter((o) => o.status === 'pagado' && getOrderPaymentCategory(o) === 'transferencia').length;
  const mixedPayments = allOrders.filter((o) => o.status === 'pagado' && getOrderPaymentCategory(o) === 'mixto').length;
  const urgentOrders = allOrders.filter((o) => o.status === 'por_verificar');
  const deliveredOrders = allOrders.filter((o) => isPorCobrarStatus(o.status));
  const paidOrders = allOrders.filter((o) => o.status === 'pagado');
  const tableNumbers = useMemo(() => Object.keys(ordersByTable).map(Number).sort((a, b) => a - b), [ordersByTable]);
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

  const urgentGroupedOrders = useMemo(() => {
    const orderById = new Map<string, Order>();
    allOrders.forEach((order) => orderById.set(order.id, order));

    const childrenByParent = new Map<string, Order[]>();
    allOrders.forEach((order) => {
      if (!order.parent_order_id || !orderById.has(order.parent_order_id)) return;
      const list = childrenByParent.get(order.parent_order_id) || [];
      list.push(order);
      childrenByParent.set(order.parent_order_id, list);
    });

    const roots = allOrders
      .filter((order) => !order.parent_order_id || !orderById.has(order.parent_order_id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return roots
      .map((root) => {
        const members: Order[] = [root];

        const appendChildren = (parentId: string) => {
          const children = childrenByParent.get(parentId) || [];
          children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          children.forEach((child) => {
            members.push(child);
            appendChildren(child.id);
          });
        };

        appendChildren(root.id);

        return {
          root,
          members,
          isLinkedGroup: members.length > 1,
          payableTotal: members
            .filter((member) => isPayableStatus(member.status))
            .reduce((sum, current) => sum + current.total, 0),
          pendingMembers: members.filter((member) => member.status === 'por_verificar'),
        };
      })
      .filter((group) => group.pendingMembers.length > 0);
  }, [allOrders]);

  // Datos para StatisticsCard
  const statsForCard = {
    totalOrders: statistics.ordersCount,
    totalRevenue: statistics.totalPaid,
    pendingPayments: pendingVerificationCount,
    verifiedPayments: paidOrders.length,
    cashPayments,
    transferPayments,
    mixedPayments,
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
    waiterQuery.trim() !== '',
    orderIdQuery.trim() !== '',
  ].filter(Boolean).length;

  const handleQuickFilterByStatus = (status: FilterStatus) => {
    onFilterStatusChange(status);
    setViewMode('tables');
  };

  const handleDesktopTableSelect = (tableNumber: number) => {
    onSelectTable(tableNumber);
    setFocusedOrderId(null);
    setIsTableModalOpen(true);
  };

  useEffect(() => {
    if (!shortcutTarget || shortcutNonce === 0) return;
    setViewMode('tables');
    onSelectTable(shortcutTarget.tableNumber);
    setFocusedOrderId(shortcutTarget.orderId);
    setIsTableModalOpen(true);
  }, [shortcutNonce, shortcutTarget, onSelectTable]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 flex flex-col">
      <div className="max-w-[1920px] mx-auto w-full flex-1 flex flex-col">
        {/* Notificaciones */}
        {notification && (
          <Notification
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onClose={onCloseNotification}
          />
        )}

        {/* Header */}
        <CashierHeader
          pendingVerificationCount={pendingVerificationCount}
          pendingBlockchainCount={pendingBlockchainCount}
          showStats={showStats}
          onToggleStats={onToggleStats}
          onExportReport={onExportReport}
          onOpenPrintSettings={onOpenPrintSettings}
          onOpenBlockchainModal={onOpenBlockchainModal}
          onOpenBrebPanel={onOpenBrebPanel}
          hasWsNotification={hasWsNotification}
          onOpenPrintMonitor={() => setOpenPrintMonitorSignal((prev) => prev + 1)}
          activeFiltersCount={activeFiltersCount}
          orderIdQuery={orderIdQuery}
          onOpenOrderIdSearch={() => setIsOrderSearchModalOpen(true)}
          waiterQuery={waiterQuery}
          onOpenWaiterSearch={() => setIsWaiterPickerOpen(true)}
          onOpenMetrics={() => navigate('/cashier/metrics')}
          quickTablesCount={tableNumbers.length}
          onOpenQuickTableSelect={() => setIsQuickTablePickerOpen(true)}
          onOpenAttendanceModal={() => setIsAttendanceModalOpen(true)}
        />

        {/* Estadísticas */}
        {showStats && <StatisticsCard stats={statsForCard} />}

        {/* Filtros */}
        <CashierFilters
          filterStatus={filterStatus}
          paymentMethodFilter={paymentMethodFilter}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onFilterStatusChange={onFilterStatusChange}
          onPaymentMethodFilterChange={onPaymentMethodFilterChange}
          onSearchQueryChange={onSearchQueryChange}
          onSortByChange={onSortByChange}
          onClearFilters={onClearFilters}
          totalOrders={totalOrders}
          pendingVerificationCount={pendingVerificationCount}
          cashPayments={cashPayments}
          transferPayments={transferPayments}
          mixedPayments={mixedPayments}
        />

        {/* Acciones rápidas equivalentes a móvil */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={() => handleQuickFilterByStatus('por_verificar')}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 text-left shadow-md hover:shadow-lg transition-all"
          >
            <p className="text-2xl font-bold">{urgentOrders.length}</p>
            <p className="text-xs font-semibold">⚠️ Por Verificar</p>
          </button>
          <button
            onClick={() => handleQuickFilterByStatus('entregado')}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 text-left shadow-md hover:shadow-lg transition-all"
          >
            <p className="text-2xl font-bold">{deliveredOrders.length}</p>
            <p className="text-xs font-semibold">🧾 Por Cobrar</p>
          </button>
          <button
            onClick={() => handleQuickFilterByStatus('pagado')}
            className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 text-left shadow-md hover:shadow-lg transition-all"
          >
            <p className="text-2xl font-bold">{paidOrders.length}</p>
            <p className="text-xs font-semibold">💰 Pagadas</p>
          </button>
        </div>

        {/* Tabs de vista: Mesas/Urgentes */}
        <div className="mt-4 grid grid-cols-2 gap-2 max-w-md">
          <button
            onClick={() => setViewMode('tables')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'tables' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-700 border border-indigo-200'
            }`}
          >
            🪑 Por Mesas
          </button>
          <button
            onClick={() => setViewMode('urgent')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'urgent' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-700 border border-indigo-200'
            }`}
          >
            ⚠️ Urgentes ({urgentOrders.length})
          </button>
        </div>

        {viewMode === 'tables' ? (
          <div className="mt-6 flex gap-4 flex-1 min-h-[500px] pb-4">
            <CinemaTablesSelector
              ordersByTable={ordersByTable}
              selectedTable={selectedTable}
              onSelectTable={handleDesktopTableSelect}
            />
            <OrdersPanel
              orders={sortedSelectedOrders}
              selectedTable={selectedTable}
              isLoading={isLoading}
              hasFailed={hasFailed}
              onStatusChange={onStatusChange}
              onConfirmPayment={onConfirmPayment}
              onRejectPayment={onRejectPayment}
              onViewProof={(order) => setSelectedProofOrder(order)}
              onViewDetail={(orderId) => setSelectedOrderIdForDetail(orderId)}
              onPrintCommand={onPrintCommand}
              onPrintFullCommand={onPrintFullCommand}
              onPreviewTickets={onPreviewTickets}
              onRetryLoadOrders={onRetryLoadOrders}
              onRetryPrint={onRetryPrint}
              openPrintMonitorSignal={openPrintMonitorSignal}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4 flex-1 overflow-y-auto pr-2 min-h-[500px] pb-4">
            {urgentGroupedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-10 text-center border border-emerald-200">
                <p className="text-5xl mb-3">✅</p>
                <p className="text-gray-600 font-semibold">No hay pagos por verificar</p>
              </div>
            ) : (
              urgentGroupedOrders.map((group) => (
                <div
                  key={group.root.id}
                  className={`rounded-2xl shadow-lg p-4 border-2 ${group.isLinkedGroup ? 'bg-orange-50 border-orange-300' : 'bg-white border-orange-300'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold">Mesa {group.root.table_number}</h3>
                      {group.isLinkedGroup ? (
                        <p className="text-sm text-orange-700 font-semibold">
                          Grupo enlazado: {group.members.length} comandas
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">Comanda individual</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">${group.payableTotal.toFixed(2)}</p>
                      <p className="text-xs text-orange-700 font-semibold">
                        {group.pendingMembers.length} por verificar
                      </p>
                    </div>
                  </div>

                  <div className="relative pl-3">
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-orange-300 to-violet-300" />
                    {group.members.map((order, index) => {
                      const isPending = order.status === 'por_verificar';
                      return (
                        <div
                          key={order.id}
                          className="relative"
                          style={{ marginLeft: `${index * 12}px` }}
                        >
                          {index > 0 && (
                            <span className="absolute -left-3 top-7 h-[2px] w-3 rounded-full bg-indigo-200" />
                          )}
                          <div className={`rounded-xl border p-3 shadow-sm ${order.parent_order_id ? 'bg-violet-50 border-violet-200' : 'bg-indigo-50 border-indigo-200'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-bold">
                                {group.isLinkedGroup ? (index === 0 ? 'Padre' : `Hija ${index}`) : 'Comanda'} #{order.id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-gray-600">Mesero: {order.waiter_name || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-700">${order.total.toFixed(2)}</p>
                              <p className={`text-xs font-semibold ${isPending ? 'text-orange-700' : 'text-gray-500'}`}>
                                {order.status}
                              </p>
                            </div>
                          </div>

                          {isPending ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => onConfirmPayment(order.id)}
                                className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold shadow-sm"
                              >
                                ✓ Confirmar
                              </button>
                              <button
                                onClick={() => onRejectPayment(order.id)}
                                className="px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 font-semibold shadow-sm"
                              >
                                ✕ Rechazar
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-2">
                              Esta comanda no está en verificación
                            </div>
                          )}

                          <button
                            onClick={() => setSelectedOrderIdForDetail(order.id)}
                            className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-sm"
                          >
                            📋 Ver Detalle
                          </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal de Comprobante */}
        {selectedProofOrder && (
          <QuickProofView
            order={selectedProofOrder}
            onClose={() => setSelectedProofOrder(null)}
            onConfirm={(targetOrderId) => {
              onConfirmPayment(targetOrderId);
              setSelectedProofOrder(null);
            }}
            onReject={(targetOrderId) => {
              onRejectPayment(targetOrderId);
              setSelectedProofOrder(null);
            }}
          />
        )}

        {/* Modal de Detalle de Orden */}
        {selectedOrderIdForDetail && (
          <OrderDetailModal
            orderId={selectedOrderIdForDetail}
            onClose={() => setSelectedOrderIdForDetail(null)}
            editable={true}
          />
        )}

        {/* Modal de órdenes por mesa con agrupación completa (paridad mobile) */}
        <TableOrdersModal
          isOpen={isTableModalOpen && selectedTable !== null}
          onClose={() => {
            setIsTableModalOpen(false);
            setFocusedOrderId(null);
          }}
          tableNumber={selectedTable}
          orders={selectedTable ? (ordersByTable[selectedTable] || []) : []}
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

        <OrderIdSearchModal
          isOpen={isOrderSearchModalOpen}
          value={orderIdQuery}
          onChange={onOrderIdQueryChange}
          onSubmit={(value) => {
            const normalized = value.trim();
            if (!normalized) return;
            setIsOrderSearchModalOpen(false);
            onOrderIdQueryChange('');
            navigate(`/cashier/search/${encodeURIComponent(normalized)}`);
          }}
          onClose={() => setIsOrderSearchModalOpen(false)}
        />

        <WaiterPickerModal
          isOpen={isWaiterPickerOpen}
          waiters={waiterOptions}
          selectedWaiter={waiterQuery}
          onSelectWaiter={(waiterName) => {
            const normalized = waiterName.trim();
            if (!normalized) return;
            onWaiterQueryChange(normalized);
            navigate(`/cashier/search/waiter/${encodeURIComponent(normalized)}`);
          }}
          onClear={() => onWaiterQueryChange('')}
          onClose={() => setIsWaiterPickerOpen(false)}
        />

        <QuickTablePickerModal
          isOpen={isQuickTablePickerOpen}
          tableNumbers={tableNumbers}
          selectedTable={selectedTable}
          onSelectTable={(tableNumber) => {
            setViewMode('tables');
            onSelectTable(tableNumber);
            setFocusedOrderId(null);
            setIsTableModalOpen(true);
          }}
          onClose={() => setIsQuickTablePickerOpen(false)}
        />

        <AttendanceNotebookModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
        />
      </div>
    </div>
  );
};

