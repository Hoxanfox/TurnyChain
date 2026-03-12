import React, { useState } from 'react';
import type { Order } from '../../../types/orders';
import OrderGridView from '../../shared/orders/components/OrderGridView';
import { QuickProofView } from './QuickProofView';
import { StationPrintModal } from './StationPrintModal';
import { formatMoney } from '../../../utils/formatUtils';

interface TableOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: number | null;
  orders: Order[];
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewDetail: (orderId: string) => void;
  onPrintFullCommand?: (orderId: string) => void;
  onPreviewTickets?: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
}

export const TableOrdersModal: React.FC<TableOrdersModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  orders,
  onStatusChange,
  onConfirmPayment,
  onRejectPayment,
  onViewDetail,
  onPrintFullCommand,
  onPreviewTickets,
  onCancelOrder,
}) => {
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [stationPrintOrderId, setStationPrintOrderId] = useState<string | null>(null);

  if (!isOpen || !tableNumber) return null;

  // Filtrar órdenes según la pestaña activa
  const filteredOrders = orders.filter(order => {
    if (filterTab === 'pending') return order.status === 'por_verificar';
    if (filterTab === 'paid') return order.status === 'pagado';
    if (filterTab === 'cancelled') return order.status === 'cancelado';
    return true;
  });

  // Calcular estadísticas
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingCount = orders.filter(o => o.status === 'por_verificar').length;
  const paidCount = orders.filter(o => o.status === 'pagado').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelado').length;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 w-full h-full sm:max-w-4xl sm:max-h-[90vh] sm:rounded-2xl overflow-hidden flex flex-col text-gray-900" style={{ colorScheme: 'light' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🪑</span>
                <div>
                  <h2 className="text-2xl font-bold">Mesa {tableNumber}</h2>
                  <p className="text-sm opacity-90">{orders.length} órden{orders.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{formatMoney(totalAmount)}</p>
                <p className="text-xs text-white/90">Total</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-xs text-white/90">Por Verificar</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{paidCount}</p>
                <p className="text-xs text-white/90">Pagadas</p>
              </div>
              {cancelledCount > 0 && (
                <div className="bg-red-500/40 rounded-lg p-2 text-center col-span-3 mt-1">
                  <p className="text-lg font-bold text-white">{cancelledCount} ❌ Cancelada{cancelledCount !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pestañas de filtro */}
          <div className="bg-white border-b-2 border-gray-200 px-2 py-3 text-gray-900">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTab('all')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterTab === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Todas ({orders.length})
              </button>
              <button
                onClick={() => setFilterTab('pending')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterTab === 'pending'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚠️ Por Verificar ({pendingCount})
              </button>
              <button
                onClick={() => setFilterTab('paid')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterTab === 'paid'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Pagadas ({paidCount})
              </button>
              {cancelledCount > 0 && (
                <button
                  onClick={() => setFilterTab('cancelled')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    filterTab === 'cancelled'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ❌ Canceladas ({cancelledCount})
                </button>
              )}
            </div>
          </div>

          {/* Lista de órdenes */}
          <div className="flex-1 overflow-y-auto p-4 text-gray-900">
            {filteredOrders.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-6xl mb-4">📭</p>
                  <p className="text-gray-500 text-lg">No hay órdenes en esta categoría</p>
                </div>
              </div>
            ) : (
              <OrderGridView
                orders={filteredOrders}
                renderActions={(order) => (
                  <div className="space-y-2">
                    {order.status === 'por_verificar' ? (
                      <>
                        <button
                          onClick={() => setSelectedProofOrder(order)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-xl">🔍</span>
                          <span>Ver Comprobante</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onConfirmPayment(order.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md transition-all"
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => onRejectPayment(order.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md transition-all"
                          >
                            ✕ Rechazar
                          </button>
                        </div>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        {/* Sección de Impresión */}
                        <div className="border-t-2 border-gray-200 pt-2 mt-1">
                          <p className="text-xs text-gray-600 font-semibold mb-2 text-center">🖨️ OPCIONES DE IMPRESIÓN</p>
                          {onPreviewTickets && (
                            <button
                              onClick={() => onPreviewTickets(order.id)}
                              className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-2"
                            >
                              <span className="text-lg">🎫</span>
                              <span className="text-sm">Vista Previa Tickets</span>
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setStationPrintOrderId(order.id)}
                              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
                            >
                              <span className="text-lg">🏪</span>
                              <span className="text-xs leading-tight">Tickets Cocina</span>
                            </button>
                            {onPrintFullCommand && (
                              <button
                                onClick={() => onPrintFullCommand(order.id)}
                                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
                              >
                                <span className="text-lg">📄</span>
                                <span className="text-xs leading-tight">Comanda Completa</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : order.status === 'pagado' ? (
                      <>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl text-center font-semibold">
                          ✓ Pagado Completamente
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            onClick={() => onViewDetail(order.id)}
                            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
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
                                className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-2"
                              >
                                <span className="text-lg">🎫</span>
                                <span className="text-sm">Vista Previa Tickets</span>
                              </button>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setStationPrintOrderId(order.id)}
                                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
                              >
                                <span className="text-lg">🏪</span>
                                <span className="text-xs leading-tight">Tickets Cocina</span>
                              </button>

                              {onPrintFullCommand && (
                                <button
                                  onClick={() => onPrintFullCommand(order.id)}
                                  className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
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
                      <div className="space-y-2">
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-3 rounded-xl text-center font-semibold">
                          ❌ Orden Cancelada
                        </div>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          onChange={(e) => onStatusChange(order.id, e.target.value)}
                          value={order.status}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800 bg-white"
                        >
                          <option value="pendiente_aprobacion">⏳ Pendiente</option>
                          <option value="recibido">📥 Recibido</option>
                          <option value="en_preparacion">👨‍🍳 En Preparación</option>
                          <option value="listo_para_servir">🍽️ Listo para Servir</option>
                          <option value="entregado">✅ Entregado</option>
                          <option value="pagado">💰 Pagado</option>
                        </select>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        {/* Sección de Impresión */}
                        <div className="border-t-2 border-gray-200 pt-2 mt-1">
                          <p className="text-xs text-gray-600 font-semibold mb-2 text-center">🖨️ OPCIONES DE IMPRESIÓN</p>
                          {onPreviewTickets && (
                            <button
                              onClick={() => onPreviewTickets(order.id)}
                              className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-2"
                            >
                              <span className="text-lg">🎫</span>
                              <span className="text-sm">Vista Previa Tickets</span>
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setStationPrintOrderId(order.id)}
                              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
                            >
                              <span className="text-lg">🏪</span>
                              <span className="text-xs leading-tight">Tickets Cocina</span>
                            </button>
                            {onPrintFullCommand && (
                              <button
                                onClick={() => onPrintFullCommand(order.id)}
                                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 font-semibold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1"
                              >
                                <span className="text-lg">📄</span>
                                <span className="text-xs leading-tight">Comanda Completa</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onCancelOrder(order.id)}
                          className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-all border border-red-200"
                        >
                          ❌ Cancelar Orden
                        </button>
                      </div>
                    )}
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de Impresión por Estación */}
      <StationPrintModal
        isOpen={stationPrintOrderId !== null}
        orderId={stationPrintOrderId}
        onClose={() => setStationPrintOrderId(null)}
      />

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
    </>
  );
};

