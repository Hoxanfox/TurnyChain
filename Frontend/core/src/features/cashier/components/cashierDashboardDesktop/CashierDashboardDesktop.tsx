import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../../../../types/orders';
import type { FilterStatus, PaymentMethodFilter, SortBy } from '../cashierDashboardShared/CashierFilters';
import type { CashierNotification, CashierStatistics } from '../../types/cashierDashboardTypes';
import { Notification } from '../../../../components/Notification';
import { CinemaTablesSelector } from '../cashierDashboardShared/CinemaTablesSelector';
import OrderDetailModal from '../../../shared/orders/components/OrderDetailModal';
import { OrderIdSearchModal } from '../cashierDashboardShared/OrderIdSearchModal';
import { WaiterPickerModal } from '../cashierDashboardShared/WaiterPickerModal';
import { QuickTablePickerModal } from '../cashierDashboardShared/QuickTablePickerModal';
import { AttendanceNotebookModal } from '../cashierDashboardShared/AttendanceNotebookModal';

import { useCashierDesktopViewModel } from './hooks/useCashierDesktopViewModel';
import { DesktopLayout } from './layout/DesktopLayout';
import { DesktopSidebar } from './layout/DesktopSidebar';
import { DesktopTableDetailView } from './layout/DesktopTableDetailView';


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
  onSelectTable: (tableNumber: number | null) => void;
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

export const CashierDashboardDesktop: React.FC<CashierDashboardDesktopProps> = (props) => {
  const navigate = useNavigate();
  const vm = useCashierDesktopViewModel(props);

  const { state, actions, derived } = vm;

  const handleTableSelect = (tableNumber: number | null) => {
    props.onSelectTable(tableNumber);
    if (tableNumber !== null) {
      actions.setViewMode('tables');
    }
  };

  const handleCloseRightPanel = () => {
    props.onSelectTable(null);
  };

  return (
    <DesktopLayout
      isRightPanelOpen={false}
      sidebar={
        <DesktopSidebar
          viewMode={state.viewMode}
          setViewMode={(mode) => {
            actions.setViewMode(mode);
            if (mode === 'urgent') handleCloseRightPanel(); // Close right panel if switching to urgent view
          }}
          urgentOrdersCount={derived.urgentOrders.length}
          onExportReport={props.onExportReport}
          onOpenPrintSettings={props.onOpenPrintSettings}
          onOpenBrebPanel={props.onOpenBrebPanel}
          onOpenMetrics={() => navigate('/cashier/metrics')}
          onOpenAttendanceModal={() => actions.setIsAttendanceModalOpen(true)}
          onOpenOrderSearch={() => actions.setIsOrderSearchModalOpen(true)}
        />
      }
      rightPanel={null}
    >
      {/* Notifications */}
      {props.notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <Notification
            title={props.notification.title}
            message={props.notification.message}
            type={props.notification.type}
            onClose={props.onCloseNotification}
          />
        </div>
      )}

      {/* Main Area Content */}
      <div className="h-full flex flex-col overflow-hidden">
        {props.selectedTable !== null ? (
          <div className="flex-1 w-full h-full overflow-hidden">
            <DesktopTableDetailView
              tableNumber={props.selectedTable}
              orders={props.ordersByTable[props.selectedTable] || []}
              onConfirmPayment={props.onConfirmPayment}
              onRejectPayment={props.onRejectPayment}
              onViewDetail={(orderId) => actions.setSelectedOrderIdForDetail(orderId)}
              onOpenCheckout={props.onOpenCheckout}
              onOpenCheckoutGroup={props.onOpenCheckoutGroup}
              onCancelOrder={(orderId) => props.onStatusChange(orderId, 'cancelado')}
              onRetryPrint={props.onRetryPrint}
              onCloseTable={handleCloseRightPanel}
              highlightOrderId={state.focusedOrderId}
            />
          </div>
        ) : (
          <>
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-2xl font-bold text-slate-800">
                {state.viewMode === 'tables' ? 'Vista General de Mesas' : 'Cola de Órdenes'}
              </h2>
              <div className="flex items-center gap-3">
                 <button
                   onClick={() => actions.setIsWaiterPickerOpen(true)}
                   className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                 >
                   Meseros
                 </button>
                 <button
                   onClick={() => actions.setIsQuickTablePickerOpen(true)}
                   className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                 >
                   Buscar Mesa
                 </button>
              </div>
            </div>

            {/* View Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
          {state.viewMode === 'tables' ? (
            <div className="w-full h-full">
              <CinemaTablesSelector
                ordersByTable={props.ordersByTable}
                selectedTable={props.selectedTable}
                onSelectTable={handleTableSelect}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col overflow-hidden">
              <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-lg w-max mx-2">
                <button
                  onClick={() => actions.setUrgentTab('por_verificar')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${state.urgentTab === 'por_verificar' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-amber-50'}`}
                >
                  Por Verificar
                </button>
                <button
                  onClick={() => actions.setUrgentTab('entregado')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${state.urgentTab === 'entregado' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50'}`}
                >
                  Por Cobrar
                </button>
                <button
                  onClick={() => actions.setUrgentTab('pagado')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${state.urgentTab === 'pagado' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-emerald-50'}`}
                >
                  Pagadas
                </button>
                <button
                  onClick={() => actions.setUrgentTab('cancelado')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${state.urgentTab === 'cancelado' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:bg-rose-50'}`}
                >
                  Canceladas
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-4">
                {derived.filteredGroupedOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200 mt-4">
                    <span className="text-5xl block mb-4">✅</span>
                    <p className="text-slate-500 font-semibold text-lg">No hay órdenes en esta vista</p>
                  </div>
                ) : (
                  derived.filteredGroupedOrders.map((group) => (
                   <div key={group.root.id} className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                     <div className="bg-orange-50/50 p-4 border-b border-orange-100 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-slate-800">Mesa {group.root.table_number}</h3>
                          <p className="text-sm text-orange-700 font-medium">
                            {group.isLinkedGroup ? `Grupo: ${group.members.length} comandas` : 'Comanda individual'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-emerald-600">${group.payableTotal.toFixed(2)}</p>
                          <p className="text-xs text-orange-600 font-semibold">
                            {group.pendingMembers.length} por verificar
                          </p>
                        </div>
                     </div>
                     <div className="p-4 flex gap-4 overflow-x-auto custom-scrollbar">
                        {group.members.map((order) => (
                          <div key={order.id} className="shrink-0 w-64 bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col">
                             <div className="flex justify-between items-start mb-2">
                               <div>
                                 <p className="text-sm font-bold text-slate-800">#{order.id.slice(0, 8)}</p>
                                 <p className="text-xs text-slate-500">{order.waiter_name}</p>
                               </div>
                               <p className="font-bold text-slate-800">${order.total.toFixed(2)}</p>
                             </div>
                             
                             <div className="mt-auto pt-3 flex gap-2">
                               <button onClick={() => actions.setSelectedOrderIdForDetail(order.id)} className="flex-1 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-300 transition-colors">
                                 Detalle
                               </button>
                               {order.status === 'por_verificar' && (
                                 <button onClick={() => { handleTableSelect(order.table_number); actions.setFocusedOrderId(order.id); }} className="flex-1 py-1.5 bg-orange-500 text-white text-xs font-bold rounded hover:bg-orange-600 transition-colors">
                                   Revisar
                                 </button>
                               )}
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                ))
              )}
              </div>
            </div>
          )}
        </div>
      </>
        )}
      </div>

      {/* Modals */}
      {state.selectedOrderIdForDetail && (
        <OrderDetailModal
          orderId={state.selectedOrderIdForDetail}
          onClose={() => actions.setSelectedOrderIdForDetail(null)}
          editable={true}
        />
      )}

      <OrderIdSearchModal
        isOpen={state.isOrderSearchModalOpen}
        value={props.orderIdQuery}
        onChange={props.onOrderIdQueryChange}
        onSubmit={(value) => {
          const normalized = value.trim();
          if (!normalized) return;
          actions.setIsOrderSearchModalOpen(false);
          props.onOrderIdQueryChange('');
          navigate(`/cashier/search/${encodeURIComponent(normalized)}`);
        }}
        onClose={() => actions.setIsOrderSearchModalOpen(false)}
      />

      <WaiterPickerModal
        isOpen={state.isWaiterPickerOpen}
        waiters={derived.waiterOptions}
        selectedWaiter={props.waiterQuery}
        onSelectWaiter={(waiterName) => {
          const normalized = waiterName.trim();
          if (!normalized) return;
          props.onWaiterQueryChange(normalized);
          navigate(`/cashier/search/waiter/${encodeURIComponent(normalized)}`);
        }}
        onClear={() => props.onWaiterQueryChange('')}
        onClose={() => actions.setIsWaiterPickerOpen(false)}
      />

      <QuickTablePickerModal
        isOpen={state.isQuickTablePickerOpen}
        tableNumbers={derived.tableNumbers}
        selectedTable={props.selectedTable}
        onSelectTable={(tableNumber) => {
          actions.setViewMode('tables');
          props.onSelectTable(tableNumber);
          actions.setFocusedOrderId(null);
        }}
        onClose={() => actions.setIsQuickTablePickerOpen(false)}
      />

      <AttendanceNotebookModal
        isOpen={state.isAttendanceModalOpen}
        onClose={() => actions.setIsAttendanceModalOpen(false)}
      />
    </DesktopLayout>
  );
};
