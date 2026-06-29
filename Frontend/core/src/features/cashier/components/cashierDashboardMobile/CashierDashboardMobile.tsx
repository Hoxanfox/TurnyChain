// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboardMobile.tsx
// =================================================================
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../../../../types/orders';
import type { FilterStatus, PaymentMethodFilter, SortBy } from '../cashierDashboardShared/CashierFilters';
import { StatisticsCard } from '../cashierDashboardShared/StatisticsCard';
import { QuickActionsBar } from '../cashierDashboardShared/QuickActionsBar';
import type { CashierNotification, CashierStatistics } from '../../types/cashierDashboardTypes';
import { Notification } from '../../../../components/Notification';
import { CashierMobileHeader } from './components/CashierMobileHeader';
import { CashierMobileTabs } from './components/CashierMobileTabs';
import { CashierMobileLoading } from './components/CashierMobileLoading';
import { CashierMobileError } from './components/CashierMobileError';
import { CashierMobileContent } from './components/CashierMobileContent';
import { WaiterApprovedStatsPanel } from './components/waiterStats/WaiterApprovedStatsPanel';
import { useCashierMobileDerivedData } from './hooks/useCashierMobileDerivedData';
import { useCashierMobilePagination } from './hooks/useCashierMobilePagination';
import { CashRegisterModal } from './components/cashRegister/CashRegisterModal';

const FilterModal = React.lazy(() => import('../cashierDashboardShared/FilterModal').then((mod) => ({
  default: mod.FilterModal,
})));
const TableOrdersModal = React.lazy(() => import('../cashierDashboardShared/TableOrdersModal').then((mod) => ({
  default: mod.TableOrdersModal,
})));
const OrderIdSearchModal = React.lazy(() => import('../cashierDashboardShared/OrderIdSearchModal').then((mod) => ({
  default: mod.OrderIdSearchModal,
})));
const WaiterPickerModal = React.lazy(() => import('../cashierDashboardShared/WaiterPickerModal').then((mod) => ({
  default: mod.WaiterPickerModal,
})));
const QuickTablePickerModal = React.lazy(() => import('../cashierDashboardShared/QuickTablePickerModal').then((mod) => ({
  default: mod.QuickTablePickerModal,
})));
const OrderDetailModal = React.lazy(() => import('../../../shared/orders/components/OrderDetailModal'));

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
  pendingBlockchainCount: number;
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
  onOpenBlockchainModal: () => void;
  onCloseNotification: () => void;
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onPrintCommand: (orderId: string) => void;
  onPrintFullCommand: (orderId: string) => void;
  onPreviewTickets: (orderId: string) => void;
  onOpenCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onOpenCheckoutGroup: (ordersInfo: { id: string, total: number }[], total: number, tableNumber: number) => void;
  onRetryPrint: (orderId: string) => void;
  onRetryLoadOrders?: () => void;
  onOpenBrebPanel: () => void;
  shortcutTarget?: { tableNumber: number; orderId: string } | null;
  shortcutNonce?: number;
  hasWsNotification?: boolean;
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
  pendingBlockchainCount,
  isLoading,
  hasFailed = false,
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
  onOpenBrebPanel,
  shortcutTarget = null,
  shortcutNonce = 0,
  hasWsNotification = false,
}) => {
  const navigate = useNavigate();
  const isPorCobrarStatus = useMemo(
    () => (status: string) => status === 'entregado' || status === 'pendiente_aprobacion',
    []
  );

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showOrderIdModal, setShowOrderIdModal] = useState(false);
  const [showWaiterPicker, setShowWaiterPicker] = useState(false);
  const [showQuickTablePicker, setShowQuickTablePicker] = useState(false);
  const [showCashRegisterModal, setShowCashRegisterModal] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tables' | 'urgent' | 'waiter-stats'>('tables');

  useEffect(() => {
    if (!shortcutTarget || shortcutNonce === 0) return;
    setViewMode('tables');
    setSelectedTableNumber(shortcutTarget.tableNumber);
    setFocusedOrderId(shortcutTarget.orderId);
  }, [shortcutNonce, shortcutTarget]);

  const {
    allOrders,
    waiterOptions,
    urgentOrders,
    deliveredOrders,
    paidOrders,
    statsForCard,
    sortedTableNumbers,
  } = useCashierMobileDerivedData({
    ordersByTable,
    statistics,
    pendingVerificationCount,
    isPorCobrarStatus,
  });

  const {
    visibleTableNumbers,
    visibleUrgentOrders,
    hasMoreTables,
    hasMoreUrgent,
    loadMoreTables,
    loadMoreUrgent,
  } = useCashierMobilePagination(sortedTableNumbers, urgentOrders);

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

      <CashierMobileHeader
        activeOrdersCount={allOrders.length}
        quickTablesCount={sortedTableNumbers.length}
        orderIdQuery={orderIdQuery}
        waiterQuery={waiterQuery}
        pendingVerificationCount={pendingVerificationCount}
        pendingBlockchainCount={pendingBlockchainCount}
        onOpenQuickTablePicker={() => setShowQuickTablePicker(true)}
        onOpenOrderIdSearch={() => setShowOrderIdModal(true)}
        onOpenWaiterPicker={() => setShowWaiterPicker(true)}
        onToggleStats={onToggleStats}
        onOpenPrintSettings={onOpenPrintSettings}
        onOpenBlockchainModal={onOpenBlockchainModal}
        onOpenFilters={() => setShowFilterModal(true)}
        onOpenHistory={() => navigate('/cashier/history')}
        onOpenMetrics={() => navigate('/cashier/metrics')}
        onExportReport={onExportReport}
        onViewUrgent={() => setViewMode('urgent')}
        onOpenCashRegister={() => setShowCashRegisterModal(true)}
        onOpenBrebPanel={onOpenBrebPanel}
        hasWsNotification={hasWsNotification}
      />

      <CashierMobileTabs
        viewMode={viewMode}
        tablesCount={sortedTableNumbers.length}
        urgentCount={urgentOrders.length}
        onChange={setViewMode}
      />

      {/* Estadísticas */}
      {showStats && (
        <div className="p-4">
          <StatisticsCard stats={statsForCard} />
        </div>
      )}

      {viewMode === 'waiter-stats' ? (
        <WaiterApprovedStatsPanel />
      ) : isLoading ? (
        <CashierMobileLoading />
      ) : hasFailed ? (
        <CashierMobileError onRetry={onRetryLoadOrders} />
      ) : (
        <CashierMobileContent
          viewMode={viewMode}
          tableNumbers={visibleTableNumbers}
          ordersByTable={ordersByTable}
          urgentOrders={visibleUrgentOrders}
          onViewOrders={setSelectedTableNumber}
          onConfirmPayment={onConfirmPayment}
          onRejectPayment={onRejectPayment}
          onViewDetail={(orderId) => setSelectedOrderIdForDetail(orderId)}
          hasMoreTables={hasMoreTables}
          hasMoreUrgent={hasMoreUrgent}
          onLoadMoreTables={loadMoreTables}
          onLoadMoreUrgent={loadMoreUrgent}
        />
      )}

      {/* Barra de acciones rápidas */}
      <QuickActionsBar
        pendingCount={urgentOrders.length}
        deliveredCount={deliveredOrders.length}
        paidCount={paidOrders.length}
        onFilterByStatus={handleQuickFilterByStatus}
      />

      <Suspense fallback={null}>
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

        {selectedOrderIdForDetail && (
          <OrderDetailModal
            orderId={selectedOrderIdForDetail}
            onClose={() => setSelectedOrderIdForDetail(null)}
            editable={true}
          />
        )}
      </Suspense>

      {showCashRegisterModal && (
        <CashRegisterModal
          isOpen={showCashRegisterModal}
          onClose={() => setShowCashRegisterModal(false)}
        />
      )}
    </div>
  );
};
