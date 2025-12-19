// =================================================================
// ARCHIVO 2: /src/features/cashier/CashierDashboard.tsx (REFACTORIZADO)
// =================================================================
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, changeOrderStatus } from '../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../app/store';
import LogoutButton from '../../components/LogoutButton';
import OrderDetailModal from '../shared/orders/components/OrderDetailModal.tsx';
import OrderGridView from '../shared/orders/components/OrderGridView.tsx';
import type { Order } from '../../types/orders';
import { getPaymentProofUrl } from '../../utils/imageUtils';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';
import { Notification } from '../../components/Notification';
// Componente para vista rápida del comprobante
// ============================================================
interface QuickProofViewProps {
  order: Order;
  onConfirm: () => void;
  onReject: () => void;
  onClose: () => void;
}

const QuickProofView: React.FC<QuickProofViewProps> = ({ order, onConfirm, onReject, onClose }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = order.payment_proof_path ? getPaymentProofUrl(order.payment_proof_path) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Verificar Comprobante</h3>
            <p className="text-sm text-gray-600">
              Mesa {order.table_number} • Total: ${order.total.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-gray-600 hover:text-gray-900"
          >
            ×
          </button>
        </div>

        {/* Información de pago */}
        <div className="p-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm">
              <strong>Método de pago:</strong>{' '}
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold ml-2">
                {order.payment_method === 'transferencia' ? '📱 Transferencia' : '💵 Efectivo'}
              </span>
            </p>
          </div>

          {/* Imagen del comprobante */}
          {imageUrl && !imageError ? (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">Comprobante:</p>
              <img
                src={imageUrl}
                alt="Comprobante de pago"
                className="w-full rounded-lg border-2 border-gray-300 shadow-lg"
                onError={() => {
                  console.error('❌ Error cargando comprobante:', imageUrl);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('✅ Comprobante cargado:', imageUrl);
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                {order.payment_proof_path}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ No se pudo cargar el comprobante
              </p>
              {order.payment_proof_path && (
                <p className="text-xs text-gray-600 mt-1">
                  {order.payment_proof_path}
                </p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={onReject}
              className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">✕</span>
              <span>Rechazar</span>
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">✓</span>
              <span>Confirmar</span>
            </button>
          </div>

          {/* Items de la orden */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold mb-2">Items de la orden:</h4>
            <ul className="space-y-2">
              {(order.items || []).map((item, idx) => (
                <li key={idx} className="text-sm flex justify-between">
                  <span>
                    {item.quantity}x {item.menu_item_name}
                  </span>
                  <span className="font-semibold">
                    ${(item.price_at_order * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t flex justify-between font-bold">
              <span>Total:</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CashierDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'por_verificar'>('all');
  const [quickProofOrder, setQuickProofOrder] = useState<Order | null>(null);
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  // ✅ Usar el hook personalizado de WebSocket para cajero con notificaciones
  useCashierWebSocket((options) => {
    setNotification(options);
  });

  useEffect(() => {
    dispatch(fetchActiveOrders());
  }, [dispatch]);

  const ordersByTable = useMemo(() => {
    if (!activeOrders) return {};

    // Filtrar por estado si es necesario
    const filteredOrders = filterStatus === 'por_verificar'
      ? activeOrders.filter(order => order.status === 'por_verificar')
      : activeOrders;

    return filteredOrders.reduce((acc, order) => {
      const tableNum = order.table_number;
      if (!acc[tableNum]) {
        acc[tableNum] = [];
      }
      acc[tableNum].push(order);
      return acc;
    }, {} as Record<number, Order[]>);
  }, [activeOrders, filterStatus]);

  // Contar órdenes por verificar
  const pendingVerificationCount = useMemo(() => {
    return activeOrders?.filter(o => o.status === 'por_verificar').length || 0;
  }, [activeOrders]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    dispatch(changeOrderStatus({ orderId, status: newStatus }));
  };

  const handleConfirmPayment = (orderId: string) => {
    if (confirm('¿Confirmar que el pago es válido?')) {
      dispatch(changeOrderStatus({ orderId, status: 'pagado' }));
      setQuickProofOrder(null);
    }
  };

  const handleRejectPayment = (orderId: string) => {
    if (confirm('¿Rechazar este comprobante? La orden volverá a "entregado".')) {
      dispatch(changeOrderStatus({ orderId, status: 'entregado' }));
      setQuickProofOrder(null);
    }
  };

  const handleViewProof = (order: Order) => {
    setQuickProofOrder(order);
  };

  return (
    <>
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
              <h1 className="text-3xl font-bold text-gray-800">Panel del Cajero</h1>
              <p className="text-gray-600">Gestión de órdenes activas.</p>
              {pendingVerificationCount > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="animate-pulse text-2xl">🔔</span>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {pendingVerificationCount} pago{pendingVerificationCount !== 1 ? 's' : ''} por verificar
                  </span>
                </div>
              )}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg shadow p-2 flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded transition-colors ${
                  filterStatus === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterStatus('por_verificar')}
                className={`px-4 py-2 rounded transition-colors relative ${
                  filterStatus === 'por_verificar' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Por Verificar
                {pendingVerificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                    {pendingVerificationCount}
                  </span>
                )}
              </button>
            </div>
            <LogoutButton />
          </div>
        </header>
        
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">
          {/* Panel de Mesas */}
          <div className="w-full md:w-1/4 bg-white p-4 rounded-lg shadow overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Mesas Activas</h2>
            <div className="space-y-2">
              {Object.keys(ordersByTable).map(tableNumStr => {
                const tableNum = Number(tableNumStr);
                return (
                  <button
                    key={tableNum}
                    onClick={() => setSelectedTable(tableNum)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedTable === tableNum ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <div className="flex justify-between font-semibold">
                      <span>Mesa {tableNum}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedTable === tableNum ? 'bg-white text-indigo-600' : 'bg-indigo-200 text-indigo-800'}`}>
                        {ordersByTable[tableNum].length}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel de Órdenes */}
          <main className="w-full md:w-3/4 overflow-y-auto">
            {status === 'loading' && <p>Cargando órdenes...</p>}
            {selectedTable ? (
              <OrderGridView
                orders={ordersByTable[selectedTable]}
                renderActions={(order) => (
                  <>
                    {order.status === 'por_verificar' ? (
                      // Acciones especiales para órdenes por verificar
                      <>
                        <button
                          onClick={() => handleViewProof(order)}
                          className="w-full px-3 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-xl">🔍</span>
                          <span>Verificar Comprobante</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button
                            onClick={() => handleConfirmPayment(order.id)}
                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => handleRejectPayment(order.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
                          >
                            ✕ Rechazar
                          </button>
                        </div>
                      </>
                    ) : (
                      // Acciones normales para otras órdenes
                      <>
                        <select
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
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
                          onClick={() => setSelectedOrderId(order.id)}
                          className="w-full text-center px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                          Ver Detalle
                        </button>
                      </>
                    )}
                  </>
                )}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">Seleccione una mesa para ver sus órdenes.</p>
              </div>
            )}
          </main>
        </div>
      </div>
      {selectedOrderId && <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
      {quickProofOrder && (
        <QuickProofView
          order={quickProofOrder}
          onConfirm={() => handleConfirmPayment(quickProofOrder.id)}
          onReject={() => handleRejectPayment(quickProofOrder.id)}
          onClose={() => setQuickProofOrder(null)}
        />
      )}

      {/* Notificaciones en tiempo real */}
      {notification && (
        <Notification
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
};

export default CashierDashboard;