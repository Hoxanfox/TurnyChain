import React, { useEffect, useState } from 'react';
import type { Order } from '../../../../types/orders';
import OrderGridView from '../../../shared/orders/components/OrderGridView';
import { PrintMonitorModal } from './PrintMonitorModal';

interface OrdersPanelProps {
  orders: Order[];
  selectedTable: number | null;
  isLoading: boolean;
  hasFailed?: boolean;
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewProof: (order: Order) => void;
  onViewDetail: (orderId: string) => void;
  onPrintCommand: (orderId: string) => void;
  onPrintFullCommand?: (orderId: string) => void;
  onPreviewTickets?: (orderId: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onRetryLoadOrders?: () => void;
  onRetryPrint?: (orderId: string) => void;
  openPrintMonitorSignal?: number;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  orders,
  selectedTable,
  isLoading,
  hasFailed,
  onStatusChange,
  onConfirmPayment,
  onRejectPayment,
  onViewProof,
  onViewDetail,
  onPrintCommand,
  onPrintFullCommand,
  onPreviewTickets,
  onCancelOrder,
  onRetryLoadOrders,
  onRetryPrint,
  openPrintMonitorSignal = 0,
}) => {
  const [isPrintMonitorOpen, setIsPrintMonitorOpen] = useState(false);

  useEffect(() => {
    if (openPrintMonitorSignal > 0) {
      setIsPrintMonitorOpen(true);
    }
  }, [openPrintMonitorSignal]);

  const handleCancelOrder = (orderId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta orden? Esta acción no se puede deshacer fácilmente.')) {
      return;
    }
    onCancelOrder?.(orderId);
  };

  if (isLoading) {
    return (
      <div className="w-full md:w-3/4 overflow-y-auto">
        <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">Cargando órdenes...</p>
        </div>
      </div>
    );
  }

  if (!selectedTable) {
    return (
      <div className="w-full md:w-3/4 overflow-y-auto">
        <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">Seleccione una mesa para ver sus órdenes.</p>
        </div>
      </div>
    );
  }

  if (hasFailed) {
    return (
      <div className="w-full md:w-3/4 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg shadow gap-3 px-6">
          <p className="text-red-600 text-lg font-semibold">Error al cargar órdenes.</p>
          {onRetryLoadOrders && (
            <button
              onClick={onRetryLoadOrders}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-3/4 overflow-y-auto">
      <OrderGridView
        orders={orders}
        renderActions={(order) => (
          <>
            {order.status === 'por_verificar' ? (
              // Acciones especiales para órdenes por verificar
              <>
                <button
                  onClick={() => onViewProof(order)}
                  className="w-full px-3 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🔍</span>
                  <span>Verificar Comprobante</span>
                </button>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => onConfirmPayment(order.id)}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
                  >
                    ✓ Confirmar
                  </button>
                  <button
                    onClick={() => onRejectPayment(order.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </>
            ) : order.status === 'pagado' ? (
              // Órdenes pagadas: Mostrar estado, botón de detalle, vista previa y re-imprimir
              <>
                <div className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-center font-bold shadow-md">
                  ✓ Pagado Completamente
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => onViewDetail(order.id)}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">📋</span>
                    <span>Ver Detalle</span>
                  </button>

                  {/* Sección de Impresión */}
                  <div className="border-t-2 border-gray-200 pt-2 mt-1">
                    <p className="text-xs text-gray-600 font-semibold mb-2 text-center">🖨️ OPCIONES DE IMPRESIÓN</p>

                    {onPreviewTickets && (
                      <button
                        onClick={() => onPreviewTickets(order.id)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-2"
                      >
                        <span className="text-lg">🎫</span>
                        <span className="text-sm">Vista Previa Tickets</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onPrintCommand(order.id)}
                        className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
                      >
                        <span className="text-lg">🏪</span>
                        <span className="text-xs leading-tight">Tickets por Estación</span>
                      </button>

                      {onPrintFullCommand && (
                        <button
                          onClick={() => onPrintFullCommand(order.id)}
                          className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
                        >
                          <span className="text-lg">📄</span>
                          <span className="text-xs leading-tight">Comanda Completa</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : order.status === 'cancelado' ? (
              <div className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg text-center font-bold shadow-md">
                ❌ Orden Cancelada
              </div>
            ) : (
              // Acciones normales para otras órdenes
              <>
                <select
                  onChange={(e) => onStatusChange(order.id, e.target.value)}
                  value={order.status}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="pendiente_aprobacion">Pendiente</option>
                  <option value="recibido">Recibido</option>
                  <option value="en_preparacion">En Preparación</option>
                  <option value="listo_para_servir">Listo para Servir</option>
                  <option value="entregado">Entregado</option>
                  <option value="pagado">Pagado</option>
                </select>
                <button
                  onClick={() => onViewDetail(order.id)}
                  className="w-full text-center px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Ver Detalle
                </button>
                {onCancelOrder && (
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="w-full text-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md font-semibold transition-all"
                  >
                    ❌ Cancelar Orden
                  </button>
                )}
              </>
            )}
          </>
        )}
      />

      <PrintMonitorModal
        isOpen={isPrintMonitorOpen}
        onClose={() => setIsPrintMonitorOpen(false)}
        orders={orders}
        onRetryPrint={(orderId) => onRetryPrint?.(orderId)}
      />
    </div>
  );
};


