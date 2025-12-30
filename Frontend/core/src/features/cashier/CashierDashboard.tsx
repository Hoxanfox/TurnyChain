// =================================================================
// ARCHIVO: /src/features/cashier/CashierDashboard.tsx (REFACTORIZADO CON SCREAMING ARCHITECTURE)
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, changeOrderStatus, fetchOrderDetails } from '../shared/orders/api/ordersSlice';
import type { AppDispatch, RootState } from '../../app/store';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useCashierLogic } from './hooks/useCashierLogic';
import { CashierDashboardDesktop } from './CashierDashboardDesktop';
import { CashierDashboardMobile } from './CashierDashboardMobile';
import { PrintSettingsModal } from './components/PrintSettingsModal';
import { KitchenTicketsPreviewModal } from './components/KitchenTicketsPreviewModal';
import { printKitchenCommand, printKitchenTicketsFrontend, getPrintSettings } from '../../utils/printUtils';
import { kitchenTicketsAPI } from '../shared/orders/api/kitchenTicketsAPI';

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

  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [isTicketsPreviewOpen, setIsTicketsPreviewOpen] = useState(false);
  const [selectedOrderIdForPreview, setSelectedOrderIdForPreview] = useState<string | null>(null);

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

  const handleConfirmPayment = async (orderId: string) => {
    if (confirm('¿Confirmar que el pago es válido?')) {
      try {
        // 1. Cambiar estado a pagado
        await dispatch(changeOrderStatus({ orderId, status: 'pagado' })).unwrap();

        // 2. Obtener detalles completos de la orden
        const orderDetails = await dispatch(fetchOrderDetails(orderId)).unwrap();

        // 3. Obtener configuración de impresión
        const printSettings = getPrintSettings();

        // 4. Imprimir tickets según configuración
        if (printSettings.ticketPrintMethod === 'backend') {
          // Método Backend: usar API
          try {
            console.log('🖨️ Imprimiendo tickets de cocina usando BACKEND...');
            const printResult = await kitchenTicketsAPI.print(orderId, false);

            if (printResult.success) {
              const ticketsCount = printResult.tickets_sent;
              const failedCount = printResult.failed_prints?.length || 0;

              if (failedCount > 0) {
                const failedStations = printResult.failed_prints.map(f => f.station_name).join(', ');
                setNotification({
                  title: '⚠️ Pago Confirmado con Advertencias',
                  message: `Mesa ${orderDetails.table_number} - ${ticketsCount} tickets enviados, pero ${failedCount} fallaron (${failedStations}). Revisa las impresoras.`,
                  type: 'warning',
                });
              } else {
                setNotification({
                  title: '✅ Pago Confirmado',
                  message: `Mesa ${orderDetails.table_number} - ${ticketsCount} ticket(s) de cocina enviados correctamente (Backend)`,
                  type: 'success',
                });
              }
            } else {
              throw new Error(printResult.message || 'Error al imprimir tickets');
            }
          } catch (printError) {
            console.error('Error al imprimir con backend:', printError);
            // Fallback a impresión local
            console.log('⚠️ Intentando impresión frontend como fallback...');
            const printed = await printKitchenTicketsFrontend(orderDetails);

            if (printed) {
              setNotification({
                title: '⚠️ Pago Confirmado (Frontend)',
                message: `Mesa ${orderDetails.table_number} - Tickets impresos desde el navegador (fallback)`,
                type: 'warning',
              });
            } else {
              setNotification({
                title: '⚠️ Pago Confirmado',
                message: `Mesa ${orderDetails.table_number} - El pago fue confirmado pero no se pudo imprimir. Imprime manualmente.`,
                type: 'warning',
              });
            }
          }
        } else {
          // Método Frontend: imprimir desde navegador
          console.log('🌐 Imprimiendo tickets de cocina usando FRONTEND...');
          const printed = await printKitchenTicketsFrontend(orderDetails);

          if (printed) {
            setNotification({
              title: '✅ Pago Confirmado',
              message: `Mesa ${orderDetails.table_number} - Tickets de cocina impresos desde el navegador`,
              type: 'success',
            });
          } else {
            setNotification({
              title: '⚠️ Pago Confirmado',
              message: `Mesa ${orderDetails.table_number} - El pago fue confirmado pero la impresión fue cancelada`,
              type: 'warning',
            });
          }
        }
      } catch (error) {
        console.error('Error al confirmar pago:', error);
        setNotification({
          title: '❌ Error',
          message: 'No se pudo confirmar el pago. Por favor intenta nuevamente.',
          type: 'error',
        });
      }
    }
  };

  const handleRejectPayment = (orderId: string) => {
    if (confirm('¿Rechazar este comprobante? La orden volverá a "entregado".')) {
      dispatch(changeOrderStatus({ orderId, status: 'entregado' }));
    }
  };

  const handleOpenPrintSettings = () => {
    setIsPrintSettingsOpen(true);
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
      // Obtener detalles completos de la orden
      const orderDetails = await dispatch(fetchOrderDetails(orderId)).unwrap();

      // Obtener configuración de impresión
      const printSettings = getPrintSettings();

      // Imprimir tickets según configuración
      if (printSettings.ticketPrintMethod === 'backend') {
        // Método Backend: usar API
        try {
          console.log('🖨️ Re-imprimiendo tickets de cocina usando BACKEND...');
          const printResult = await kitchenTicketsAPI.print(orderId, true); // true = reimpresión

          if (printResult.success) {
            const ticketsCount = printResult.tickets_sent;
            const failedCount = printResult.failed_prints?.length || 0;

            if (failedCount > 0) {
              const failedStations = printResult.failed_prints.map(f => f.station_name).join(', ');
              setNotification({
                title: '⚠️ Re-impresión Parcial',
                message: `Mesa ${orderDetails.table_number} - ${ticketsCount} tickets enviados, pero ${failedCount} fallaron (${failedStations})`,
                type: 'warning',
              });
            } else {
              setNotification({
                title: '✅ Tickets Re-impresos',
                message: `Mesa ${orderDetails.table_number} - ${ticketsCount} ticket(s) enviados correctamente (Backend)`,
                type: 'success',
              });
            }
          } else {
            throw new Error(printResult.message || 'Error al reimprimir tickets');
          }
        } catch (printError) {
          console.error('Error al reimprimir con backend:', printError);
          // Fallback a impresión frontend
          console.log('⚠️ Intentando impresión frontend como fallback...');
          const printed = await printKitchenTicketsFrontend(orderDetails);

          if (printed) {
            setNotification({
              title: '⚠️ Tickets Re-impresos (Frontend)',
              message: `Mesa ${orderDetails.table_number} - Tickets impresos desde el navegador (fallback)`,
              type: 'warning',
            });
          } else {
            setNotification({
              title: '❌ Error',
              message: 'No se pudo re-imprimir los tickets. Por favor intenta nuevamente.',
              type: 'error',
            });
          }
        }
      } else {
        // Método Frontend: imprimir desde navegador
        console.log('🌐 Re-imprimiendo tickets de cocina usando FRONTEND...');
        const printed = await printKitchenTicketsFrontend(orderDetails);

        if (printed) {
          setNotification({
            title: '✅ Tickets Re-impresos',
            message: `Mesa ${orderDetails.table_number} - Tickets impresos desde el navegador`,
            type: 'success',
          });
        } else {
          setNotification({
            title: '❌ Error',
            message: 'No se pudo re-imprimir los tickets. Por favor intenta nuevamente.',
            type: 'error',
          });
        }
      }
    } catch (error) {
      console.error('Error al reimprimir tickets:', error);
      setNotification({
        title: '❌ Error',
        message: 'No se pudo obtener los detalles de la orden. Por favor intenta nuevamente.',
        type: 'error',
      });
    }
  };

  const handlePrintFullCommand = async (orderId: string) => {
    try {
      // Obtener detalles completos de la orden
      const orderDetails = await dispatch(fetchOrderDetails(orderId)).unwrap();

      // Imprimir comanda completa usando el método local (navegador)
      console.log('📄 Imprimiendo comanda completa para orden:', orderId);
      const printed = await printKitchenCommand(orderDetails);

      if (printed) {
        setNotification({
          title: '✅ Comanda Completa Impresa',
          message: `Mesa ${orderDetails.table_number} - Comanda completa lista para imprimir`,
          type: 'success',
        });
      } else {
        setNotification({
          title: '⚠️ Impresión Cancelada',
          message: `Mesa ${orderDetails.table_number} - Impresión cancelada por el usuario`,
          type: 'warning',
        });
      }
    } catch (error) {
      console.error('Error al imprimir comanda completa:', error);
      setNotification({
        title: '❌ Error',
        message: 'No se pudo imprimir la comanda completa. Por favor intenta nuevamente.',
        type: 'error',
      });
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
    onOpenPrintSettings: handleOpenPrintSettings,
    onCloseNotification: () => setNotification(null),

    // Handlers de acciones
    onStatusChange: handleStatusChange,
    onConfirmPayment: handleConfirmPayment,
    onRejectPayment: handleRejectPayment,
    onPrintCommand: handlePrintCommand,
    onPrintFullCommand: handlePrintFullCommand,
    onPreviewTickets: handlePreviewTickets,
  };

  // Renderizar vista según el dispositivo
  if (isDesktop) {
    return (
      <>
        <CashierDashboardDesktop
          {...commonProps}
          selectedTable={cashierLogic.selectedTable}
          sortedSelectedOrders={cashierLogic.sortedSelectedOrders}
          onSelectTable={cashierLogic.setSelectedTable}
          onViewProof={() => {}} // Se maneja internamente en el componente Desktop
        />
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
      </>
    );
  }

  return (
    <>
      <CashierDashboardMobile {...commonProps} />
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
    </>
  );
};

export default CashierDashboard;