// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboard.tsx (REFACTORIZADO CON SCREAMING ARCHITECTURE)
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, changeOrderStatus } from '../shared/orders/api/ordersSlice';
import type { AppDispatch, RootState } from '../../app/store';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useCashierLogic } from './hooks/useCashierLogic';
import { CashierDashboardDesktop } from './CashierDashboardDesktop';
import { CashierDashboardMobile } from './CashierDashboardMobile';

/**
 * Componente principal del Dashboard del Cajero
 *
 * Este componente actúa como contenedor (container component) que:
 * - Maneja la lógica de negocio y el estado global (Redux)
 * - Delega la presentación a componentes específicos (Desktop/Mobile)
 * - Usa hooks personalizados para la lógica del cajero
 * - Se adapta automáticamente al dispositivo del usuario
 */
const CashierDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const isDesktop = useIsDesktop();

  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  // Hook personalizado con toda la lógica del cajero
  const cashierLogic = useCashierLogic(activeOrders);

  // WebSocket para notificaciones en tiempo real
  useCashierWebSocket((options) => {
    setNotification(options);
  });

  // Cargar órdenes activas al montar el componente
  useEffect(() => {
    dispatch(fetchActiveOrders());
  }, [dispatch]);

  // Handlers de acciones
  const handleStatusChange = (orderId: string, newStatus: string) => {
    dispatch(changeOrderStatus({ orderId, status: newStatus }));
  };

  const handleConfirmPayment = (orderId: string) => {
    if (confirm('¿Confirmar que el pago es válido?')) {
      dispatch(changeOrderStatus({ orderId, status: 'pagado' }));
    }
  };

  const handleRejectPayment = (orderId: string) => {
    if (confirm('¿Rechazar este comprobante? La orden volverá a "entregado".')) {
      dispatch(changeOrderStatus({ orderId, status: 'entregado' }));
    }
  };

  // Props comunes para ambas vistas
  const commonProps = {
    // Estado
    showStats: cashierLogic.showStats,
    filterStatus: cashierLogic.filterStatus,
    paymentMethodFilter: cashierLogic.paymentMethodFilter,
    searchQuery: cashierLogic.searchQuery,
    sortBy: cashierLogic.sortBy,

    // Datos
    statistics: cashierLogic.statistics,
    ordersByTable: cashierLogic.ordersByTable,
    pendingVerificationCount: cashierLogic.pendingVerificationCount,
    isLoading: status === 'loading',

    // Notificaciones
    notification,

    // Handlers de estado
    onToggleStats: () => cashierLogic.setShowStats(!cashierLogic.showStats),
    onFilterStatusChange: cashierLogic.setFilterStatus,
    onPaymentMethodFilterChange: cashierLogic.setPaymentMethodFilter,
    onSearchQueryChange: cashierLogic.setSearchQuery,
    onSortByChange: cashierLogic.setSortBy,
    onClearFilters: cashierLogic.clearFilters,
    onExportReport: cashierLogic.exportReport,
    onCloseNotification: () => setNotification(null),

    // Handlers de acciones
    onStatusChange: handleStatusChange,
    onConfirmPayment: handleConfirmPayment,
    onRejectPayment: handleRejectPayment,
  };

  // Renderizar vista según el dispositivo
  if (isDesktop) {
    return (
      <CashierDashboardDesktop
        {...commonProps}
        selectedTable={cashierLogic.selectedTable}
        sortedSelectedOrders={cashierLogic.sortedSelectedOrders}
        onSelectTable={cashierLogic.setSelectedTable}
        onViewProof={() => {}} // Se maneja internamente en el componente Desktop
      />
    );
  }

  return <CashierDashboardMobile {...commonProps} />;
};

export default CashierDashboard;