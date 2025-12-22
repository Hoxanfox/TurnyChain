// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboardDesktop.tsx
// =================================================================
import React, { useState } from 'react';
import type { Order } from '../../types/orders';
import { CashierHeader } from './components/CashierHeader';
import { CashierFilters } from './components/CashierFilters';
import type { FilterStatus, PaymentMethodFilter, SortBy } from './components/CashierFilters';
import { StatisticsCard } from './components/StatisticsCard';
import { TablesList } from './components/TablesList';
import { OrdersPanel } from './components/OrdersPanel';
import { QuickProofView } from './components/QuickProofView';
import { Notification } from '../../components/Notification';
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

interface CashierDashboardDesktopProps {
  // Estado
  showStats: boolean;
  filterStatus: FilterStatus;
  paymentMethodFilter: PaymentMethodFilter;
  searchQuery: string;
  sortBy: SortBy;
  selectedTable: number | null;

  // Datos
  statistics: CashierStatistics;
  ordersByTable: Record<number, Order[]>;
  sortedSelectedOrders: Order[];
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
  onSelectTable: (tableNumber: number) => void;
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onPrintCommand: (orderId: string) => void;
  onViewProof: () => void;
}

export const CashierDashboardDesktop: React.FC<CashierDashboardDesktopProps> = ({
  showStats,
  filterStatus,
  paymentMethodFilter,
  searchQuery,
  sortBy,
  selectedTable,
  statistics,
  ordersByTable,
  sortedSelectedOrders,
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
  onSelectTable,
  onStatusChange,
  onConfirmPayment,
  onRejectPayment,
  onPrintCommand,
}) => {
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);
  const [selectedOrderIdForDetail, setSelectedOrderIdForDetail] = useState<string | null>(null);

  // Datos para CashierFilters
  const totalOrders = Object.values(ordersByTable).flat().length;
  const cashPayments = Object.values(ordersByTable)
    .flat()
    .filter((o) => o.payment_method === 'efectivo').length;
  const transferPayments = Object.values(ordersByTable)
    .flat()
    .filter((o) => o.payment_method === 'transferencia').length;

  // Datos para StatisticsCard
  const statsForCard = {
    totalOrders: statistics.ordersCount,
    totalRevenue: statistics.totalPaid,
    pendingPayments: pendingVerificationCount,
    verifiedPayments: Object.values(ordersByTable)
      .flat()
      .filter((o) => o.status === 'pagado').length,
    cashPayments,
    transferPayments,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-[1920px] mx-auto">
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
          showStats={showStats}
          onToggleStats={onToggleStats}
          onExportReport={onExportReport}
          onOpenPrintSettings={onOpenPrintSettings}
          activeFiltersCount={activeFiltersCount}
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
        />

        {/* Panel Principal: Mesas y Órdenes */}
        <div className="mt-6 flex gap-4 h-[calc(100vh-450px)] min-h-[500px]">
          <TablesList
            ordersByTable={ordersByTable}
            selectedTable={selectedTable}
            onSelectTable={onSelectTable}
          />
          <OrdersPanel
            orders={sortedSelectedOrders}
            selectedTable={selectedTable}
            isLoading={isLoading}
            onStatusChange={onStatusChange}
            onConfirmPayment={onConfirmPayment}
            onRejectPayment={onRejectPayment}
            onViewProof={(order) => setSelectedProofOrder(order)}
            onViewDetail={(orderId) => setSelectedOrderIdForDetail(orderId)}
            onPrintCommand={onPrintCommand}
          />
        </div>

        {/* Modal de Comprobante */}
        {selectedProofOrder && (
          <QuickProofView
            order={selectedProofOrder}
            onClose={() => setSelectedProofOrder(null)}
            onConfirm={() => {
              onConfirmPayment(selectedProofOrder.id);
              setSelectedProofOrder(null);
            }}
            onReject={() => {
              onRejectPayment(selectedProofOrder.id);
              setSelectedProofOrder(null);
            }}
          />
        )}

        {/* Modal de Detalle de Orden */}
        {selectedOrderIdForDetail && (
          <OrderDetailModal
            orderId={selectedOrderIdForDetail}
            onClose={() => setSelectedOrderIdForDetail(null)}
            editable={false}
          />
        )}
      </div>
    </div>
  );
};

