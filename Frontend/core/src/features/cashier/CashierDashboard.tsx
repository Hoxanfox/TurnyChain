// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboard.tsx
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchActiveOrders, changeOrderStatus, fetchOrderDetails } from '../shared/orders/api/ordersSlice';
import type { AppDispatch, RootState } from '../../app/store';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useCashierLogic } from './hooks/useCashierLogic';
import { CashierDashboardDesktop } from './components/cashierDashboardDesktop/CashierDashboardDesktop';
import { CashierDashboardMobile } from './components/cashierDashboardMobile/CashierDashboardMobile';
import { PrintSettingsModal } from './components/cashierDashboardShared/PrintSettingsModal';
import { KitchenTicketsPreviewModal } from './components/cashierDashboardShared/KitchenTicketsPreviewModal';
import type { CashierNotification } from './types/cashierDashboardTypes';
import { printKitchenTicketsFrontend, getPrintSettings } from '../../utils/printUtils';
import { kitchenTicketsAPI } from '../shared/orders/api/kitchenTicketsAPI';
import CheckoutModal from '../waiter/components/CheckoutModal';

const CashierDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const isDesktop = useIsDesktop();

  const [notification, setNotification] = useState<CashierNotification | null>(null);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [isTicketsPreviewOpen, setIsTicketsPreviewOpen] = useState(false);
  const [selectedOrderIdForPreview, setSelectedOrderIdForPreview] = useState<string | null>(null);

  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [checkoutGroupOrderIds, setCheckoutGroupOrderIds] = useState<string[]>([]);
  const [checkoutOrderTotal, setCheckoutOrderTotal] = useState<number>(0);
  const [checkoutTableNumber, setCheckoutTableNumber] = useState<number>(0);
  const [shortcutTarget, setShortcutTarget] = useState<{ tableNumber: number; orderId: string } | null>(null);
  const [shortcutNonce, setShortcutNonce] = useState(0);

  const cashierLogic = useCashierLogic(activeOrders);

  useCashierWebSocket((options) => {
    setNotification(options);
  });

  useEffect(() => {
    dispatch(fetchActiveOrders());
  }, [dispatch]);

  useEffect(() => {
    const stateWithShortcut = location.state as { cashierShortcut?: { tableNumber: number; orderId: string } } | null;
    const incomingShortcut = stateWithShortcut?.cashierShortcut;

    if (!incomingShortcut || status === 'loading') return;

    cashierLogic.setSelectedTable(incomingShortcut.tableNumber);
    setShortcutTarget(incomingShortcut);
    setShortcutNonce((prev) => prev + 1);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, status]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    dispatch(changeOrderStatus({ orderId, status: newStatus }));
  };

  const handleConfirmPayment = async (orderId: string) => {
    if (!confirm('¿Confirmar que el pago es válido?')) return;

    try {
      await dispatch(changeOrderStatus({ orderId, status: 'pagado' })).unwrap();
      const orderDetails = await dispatch(fetchOrderDetails(orderId)).unwrap();
      setNotification({
        title: '✅ Pago Confirmado',
        message: `Mesa ${orderDetails.table_number} - Pago confirmado correctamente.`,
        type: 'success',
      });
    } catch {
      setNotification({
        title: '❌ Error',
        message: 'No se pudo confirmar el pago. Intenta nuevamente.',
        type: 'error',
      });
    }
  };

  const handleRejectPayment = (orderId: string) => {
    if (!confirm('¿Rechazar este comprobante? La orden volverá a "entregado".')) return;
    dispatch(changeOrderStatus({ orderId, status: 'entregado' }));
  };

  const handlePreviewTickets = (orderId: string) => {
    setSelectedOrderIdForPreview(orderId);
    setIsTicketsPreviewOpen(true);
  };

  const handleCloseTicketsPreview = () => {
    setIsTicketsPreviewOpen(false);
    setSelectedOrderIdForPreview(null);
  };

  const handlePrintCommand = async (orderId: string) => {
    try {
      const orderDetails = await dispatch(fetchOrderDetails(orderId)).unwrap();
      const printSettings = getPrintSettings();

      if (printSettings.ticketPrintMethod === 'backend') {
        try {
          const printResult = await kitchenTicketsAPI.print(orderId, true);

          if (printResult.success) {
            const ticketsCount = printResult.tickets_sent;
            const failedCount = printResult.failed_prints?.length || 0;

            if (failedCount > 0) {
              const failedStations = printResult.failed_prints.map((f) => f.station_name).join(', ');
              setNotification({
                title: '⚠️ Re-impresión Parcial',
                message: `Mesa ${orderDetails.table_number} - ${ticketsCount} enviados, ${failedCount} fallaron (${failedStations}).`,
                type: 'warning',
              });
            } else {
              setNotification({
                title: '✅ Tickets Re-impresos',
                message: `Mesa ${orderDetails.table_number} - ${ticketsCount} ticket(s) enviados correctamente.`,
                type: 'success',
              });
            }
          } else {
            throw new Error(printResult.message || 'Error al reimprimir tickets');
          }
        } catch {
          const printed = await printKitchenTicketsFrontend(orderDetails);
          setNotification({
            title: printed ? '⚠️ Tickets Re-impresos (Frontend)' : '❌ Error',
            message: printed
              ? `Mesa ${orderDetails.table_number} - Tickets impresos desde el navegador (fallback).`
              : 'No se pudo re-imprimir los tickets. Intenta nuevamente.',
            type: printed ? 'warning' : 'error',
          });
        }
      } else {
        const printed = await printKitchenTicketsFrontend(orderDetails);
        setNotification({
          title: printed ? '✅ Tickets Re-impresos' : '❌ Error',
          message: printed
            ? `Mesa ${orderDetails.table_number} - Tickets impresos desde el navegador.`
            : 'No se pudo re-imprimir los tickets. Intenta nuevamente.',
          type: printed ? 'success' : 'error',
        });
      }
    } catch {
      setNotification({
        title: '❌ Error',
        message: 'No se pudo obtener los detalles de la orden.',
        type: 'error',
      });
    }
  };

  const handlePrintFullCommand = async (orderId: string) => {
    try {
      const orderDetails = await dispatch(fetchOrderDetails(orderId)).unwrap();
      const printResult = await kitchenTicketsAPI.printCashierGlobal(orderId);

      if (printResult.success) {
        setNotification({
          title: '✅ Ticket Caja Impreso',
          message: `Mesa ${orderDetails.table_number} - Ticket global enviado a impresión.`,
          type: 'success',
        });
      } else {
        setNotification({
          title: '⚠️ Impresión con advertencias',
          message: printResult.message || 'No se pudo imprimir ticket de caja.',
          type: 'warning',
        });
      }
    } catch {
      setNotification({
        title: '❌ Error',
        message: 'No se pudo imprimir el ticket global de caja.',
        type: 'error',
      });
    }
  };

  const handleOpenCheckout = (orderId: string, total: number, tableNumber: number) => {
    setCheckoutOrderId(orderId);
    setCheckoutGroupOrderIds([orderId]);
    setCheckoutOrderTotal(total);
    setCheckoutTableNumber(tableNumber);
  };

  const handleOpenCheckoutGroup = (orderIds: string[], total: number, tableNumber: number) => {
    if (orderIds.length === 0) return;
    setCheckoutOrderId(orderIds[0]);
    setCheckoutGroupOrderIds(orderIds);
    setCheckoutOrderTotal(total);
    setCheckoutTableNumber(tableNumber);
  };

  const closeCheckout = () => {
    setCheckoutOrderId(null);
    setCheckoutGroupOrderIds([]);
    setCheckoutOrderTotal(0);
    setCheckoutTableNumber(0);
  };

  const handleCheckoutSuccess = () => {
    closeCheckout();
    dispatch(fetchActiveOrders());
    setNotification({
      title: '✅ Cobro Registrado',
      message: 'Se registró el pago correctamente.',
      type: 'success',
    });
  };

  const commonProps = {
    showStats: cashierLogic.showStats,
    filterStatus: cashierLogic.filterStatus,
    paymentMethodFilter: cashierLogic.paymentMethodFilter,
    searchQuery: cashierLogic.searchQuery,
    orderIdQuery: cashierLogic.orderIdQuery,
    sortBy: cashierLogic.sortBy,

    statistics: cashierLogic.statistics,
    ordersByTable: cashierLogic.ordersByTable,
    pendingVerificationCount: cashierLogic.pendingVerificationCount,
    isLoading: status === 'loading',
    hasFailed: status === 'failed',

    notification,

    onToggleStats: () => cashierLogic.setShowStats(!cashierLogic.showStats),
    onFilterStatusChange: cashierLogic.setFilterStatus,
    onPaymentMethodFilterChange: cashierLogic.setPaymentMethodFilter,
    onSearchQueryChange: cashierLogic.setSearchQuery,
    onOrderIdQueryChange: cashierLogic.setOrderIdQuery,
    onSortByChange: cashierLogic.setSortBy,
    onClearFilters: cashierLogic.clearFilters,
    onExportReport: cashierLogic.exportReport,
    onOpenPrintSettings: () => setIsPrintSettingsOpen(true),
    onCloseNotification: () => setNotification(null),
    onRetryLoadOrders: () => dispatch(fetchActiveOrders()),

    onStatusChange: handleStatusChange,
    onConfirmPayment: handleConfirmPayment,
    onRejectPayment: handleRejectPayment,
    onPrintCommand: handlePrintCommand,
    onPrintFullCommand: handlePrintFullCommand,
    onPreviewTickets: handlePreviewTickets,
    onOpenCheckout: handleOpenCheckout,
    onOpenCheckoutGroup: handleOpenCheckoutGroup,
  };

  return (
    <>
      {isDesktop ? (
        <CashierDashboardDesktop
          {...commonProps}
          selectedTable={cashierLogic.selectedTable}
          sortedSelectedOrders={cashierLogic.sortedSelectedOrders}
          onSelectTable={cashierLogic.setSelectedTable}
          shortcutTarget={shortcutTarget}
          shortcutNonce={shortcutNonce}
          onViewProof={() => {}}
        />
      ) : (
        <CashierDashboardMobile
          {...commonProps}
          shortcutTarget={shortcutTarget}
          shortcutNonce={shortcutNonce}
        />
      )}

      <PrintSettingsModal
        isOpen={isPrintSettingsOpen}
        onClose={() => setIsPrintSettingsOpen(false)}
      />

      <KitchenTicketsPreviewModal
        isOpen={isTicketsPreviewOpen}
        orderId={selectedOrderIdForPreview}
        onClose={handleCloseTicketsPreview}
        onPrint={handlePrintCommand}
      />

      {checkoutOrderId && (
        <CheckoutModal
          orderId={checkoutOrderId}
          groupOrderIds={checkoutGroupOrderIds}
          orderTotal={checkoutOrderTotal}
          tableNumber={checkoutTableNumber}
          forcePaidAfterCheckout={true}
          onClose={closeCheckout}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </>
  );
};

export default CashierDashboard;
