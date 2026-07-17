// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboardMobile.tsx
// =================================================================
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../../../../types/orders';
import type { FilterStatus, PaymentMethodFilter, SortBy } from '../cashierDashboardShared/CashierFilters';
import { StatisticsCard } from '../cashierDashboardShared/StatisticsCard';
import type { CashierNotification, CashierStatistics } from '../../types/cashierDashboardTypes';
import { Notification } from '../../../../components/Notification';
import { CashierMobileHeader } from './components/CashierMobileHeader';
import { CashierMobileLoading } from './components/CashierMobileLoading';
import { CashierMobileError } from './components/CashierMobileError';
import { useCashierMobileDerivedData } from './hooks/useCashierMobileDerivedData';
import { CashRegisterModal } from './components/cashRegister/CashRegisterModal';
import { CashierMobileSidebar } from './components/CashierMobileSidebar';
import { StatusTablesModal } from './components/StatusTablesModal';
import { TableMapOverviewCard } from './components/TableMapOverviewCard';
import { TablePaginationModal } from './components/TablePaginationModal';
import { LayoutEditorModal } from '../layoutEditor/LayoutEditorModal';
import { AttendanceNotebookModal } from '../cashierDashboardShared/AttendanceNotebookModal';

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
  showStats: boolean;
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  waiterQuery: string;
  orderIdQuery: string;
  sortBy: SortBy;
  statistics: CashierStatistics;
  ordersByTable: Record<number, Order[]>;
  pendingVerificationCount: number;
  pendingBlockchainCount: number;
  isLoading: boolean;
  hasFailed?: boolean;
  notification: CashierNotification | null;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals for Map Navigation and Header Bulbs
  const [isPaginationModalOpen, setIsPaginationModalOpen] = useState(false);
  const [activeStatusModal, setActiveStatusModal] = useState<'por_cobrar' | 'pagadas' | 'por_verificar' | null>(null);
  
  // Layout Editor
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  useEffect(() => {
    if (!shortcutTarget || shortcutNonce === 0) return;
    setSelectedTableNumber(shortcutTarget.tableNumber);
    setFocusedOrderId(shortcutTarget.orderId);
  }, [shortcutNonce, shortcutTarget]);

  const {
    waiterOptions,
    statsForCard,
    sortedTableNumbers,
    porCobrarTables,
    pagadasTables,
    porVerificarTables,
  } = useCashierMobileDerivedData({
    ordersByTable,
    statistics,
    pendingVerificationCount,
    isPorCobrarStatus,
  });

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

      <CashierMobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        quickTablesCount={sortedTableNumbers.length}
        pendingBlockchainCount={pendingBlockchainCount}
        orderIdQuery={orderIdQuery}
        waiterQuery={waiterQuery}
        onOpenOrderIdSearch={() => setShowOrderIdModal(true)}
        onOpenWaiterPicker={() => setShowWaiterPicker(true)}
        onToggleStats={onToggleStats}
        onOpenQuickTablePicker={() => setShowQuickTablePicker(true)}
        onOpenCashRegister={() => setShowCashRegisterModal(true)}
        onOpenFilters={() => setShowFilterModal(true)}
        onOpenHistory={() => navigate('/cashier/history')}
        onOpenMetrics={() => navigate('/cashier/metrics')}
        onExportReport={onExportReport}
        onOpenPrintSettings={onOpenPrintSettings}
        onOpenBlockchainModal={onOpenBlockchainModal}
        onOpenBrebPanel={onOpenBrebPanel}
        onOpenLayoutEditor={() => setIsLayoutEditorOpen(true)}
        onOpenAttendanceModal={() => setIsAttendanceModalOpen(true)}
      />

      <CashierMobileHeader
        porCobrarCount={porCobrarTables.length}
        pagadasCount={pagadasTables.length}
        porVerificarCount={porVerificarTables.length}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenPorCobrar={() => setActiveStatusModal('por_cobrar')}
        onOpenPagadas={() => setActiveStatusModal('pagadas')}
        onOpenPorVerificar={() => setActiveStatusModal('por_verificar')}
        hasWsNotification={hasWsNotification}
      />

      {/* Estadísticas en formato Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl animate-slide-up sm:animate-in sm:fade-in sm:zoom-in-95 duration-300 shadow-2xl relative">
            <button 
              onClick={onToggleStats}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-full transition-all shadow-sm active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-2 sm:p-6">
              {/* Contenedor sin fondo blanco para que no choque con el fondo de StatisticsCard */}
              <StatisticsCard stats={statsForCard} />
            </div>
          </div>
        </div>
      )}

      {/* Body: Solo muestra el mapa resumen */}
      {isLoading ? (
        <CashierMobileLoading />
      ) : hasFailed ? (
        <CashierMobileError onRetry={onRetryLoadOrders} />
      ) : (
        <div className="p-4">
          <TableMapOverviewCard 
            tableNumbers={sortedTableNumbers}
            porCobrarTables={porCobrarTables}
            pagadasTables={pagadasTables}
            porVerificarTables={porVerificarTables}
            onSelectTable={(tableNum) => setSelectedTableNumber(tableNum)}
            onOpenPagination={() => setIsPaginationModalOpen(true)}
            onOpenSearchId={() => setShowOrderIdModal(true)}
            onOpenSearchWaiter={() => setShowWaiterPicker(true)}
          />
        </div>
      )}

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
            setShowWaiterPicker(false);
          }}
          onClose={() => setShowWaiterPicker(false)}
          onClear={() => onWaiterQueryChange('')}
        />

        <QuickTablePickerModal
          isOpen={showQuickTablePicker}
          tableNumbers={sortedTableNumbers}
          selectedTable={selectedTableNumber}
          onSelectTable={(tableNumber) => {
            setShowQuickTablePicker(false);
            setSelectedTableNumber(tableNumber);
          }}
          onClose={() => setShowQuickTablePicker(false)}
        />

        {selectedTableNumber && (
          <TableOrdersModal
            isOpen={true}
            tableNumber={selectedTableNumber}
            orders={ordersByTable[selectedTableNumber] || []}
            highlightOrderId={focusedOrderId}
            onClose={() => {
              setSelectedTableNumber(null);
              setFocusedOrderId(null);
            }}
            onStatusChange={onStatusChange}
            onCancelOrder={(orderId) => onStatusChange(orderId, 'cancelado')}
            onConfirmPayment={onConfirmPayment}
            onRejectPayment={onRejectPayment}
            onPrintCommand={onPrintCommand}
            onPrintFullCommand={onPrintFullCommand}
            onPreviewTickets={onPreviewTickets}
            onOpenCheckout={(orderId, total) => onOpenCheckout(orderId, total, selectedTableNumber)}
            onOpenCheckoutGroup={(ordersInfo, total) => onOpenCheckoutGroup(ordersInfo, total, selectedTableNumber)}
            onRetryPrint={onRetryPrint}
            onViewDetail={(orderId) => setSelectedOrderIdForDetail(orderId)}
          />
        )}

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

      <TablePaginationModal
        isOpen={isPaginationModalOpen}
        onClose={() => setIsPaginationModalOpen(false)}
        tableNumbers={sortedTableNumbers}
        ordersByTable={ordersByTable}
        onViewOrders={setSelectedTableNumber}
      />

      <StatusTablesModal
        isOpen={activeStatusModal !== null}
        onClose={() => setActiveStatusModal(null)}
        title={
          activeStatusModal === 'por_cobrar' ? 'Mesas Por Cobrar' :
          activeStatusModal === 'pagadas' ? 'Mesas Pagadas' :
          'Mesas Por Verificar'
        }
        tableNumbers={
          activeStatusModal === 'por_cobrar' ? porCobrarTables :
          activeStatusModal === 'pagadas' ? pagadasTables :
          activeStatusModal === 'por_verificar' ? porVerificarTables : []
        }
        ordersByTable={ordersByTable}
        onViewOrders={(tableNum) => {
          setSelectedTableNumber(tableNum);
        }}
        headerColorClass={
          activeStatusModal === 'por_cobrar' ? 'bg-blue-600' :
          activeStatusModal === 'pagadas' ? 'bg-emerald-600' :
          'bg-orange-600'
        }
      />

      <LayoutEditorModal
        isOpen={isLayoutEditorOpen}
        onClose={() => setIsLayoutEditorOpen(false)}
      />

      <AttendanceNotebookModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
      />
    </div>
  );
};
