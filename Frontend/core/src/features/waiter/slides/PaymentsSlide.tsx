// =================================================================
// ARCHIVO: /src/features/waiter/slides/PaymentsSlide.tsx
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import CheckoutModal from '../components/CheckoutModal';

interface PaymentsSlideProps {
  onViewOrderDetails: (orderId: string) => void;
}

const PaymentsSlide: React.FC<PaymentsSlideProps> = ({ onViewOrderDetails }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { myOrders, myOrdersStatus } = useSelector((state: RootState) => state.orders);
  const [filterStatus, setFilterStatus] = useState<'entregado' | 'por_verificar' | 'all'>('entregado');

  // Estado para el modal de checkout
  const [selectedOrderForCheckout, setSelectedOrderForCheckout] = useState<{
    id: string;
    total: number;
    table: number;
  } | null>(null);

  useEffect(() => {
    if (myOrdersStatus === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [myOrdersStatus, dispatch]);

  // Función para abrir el modal de checkout
  const handleOpenCheckout = (orderId: string, total: number, tableNumber: number) => {
    setSelectedOrderForCheckout({ id: orderId, total, table: tableNumber });
  };

  // Función para manejar el éxito del pago
  const handlePaymentSuccess = () => {
    setSelectedOrderForCheckout(null);
    // Recargar las órdenes para mostrar el estado actualizado
    dispatch(fetchMyOrders());
  };

  // Filtrar solo órdenes del día de hoy
  const todayOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (myOrders || []).filter(order => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });
  }, [myOrders]);

  // Filtrar por estado
  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return todayOrders;
    if (filterStatus === 'entregado') {
      // Por Cobrar: incluir entregadas sin pago Y entregadas con pago pendiente
      return todayOrders.filter(order => order.status === 'entregado');
    }
    if (filterStatus === 'por_verificar') {
      // En Verificación: solo las que están siendo verificadas
      return todayOrders.filter(order => order.status === 'por_verificar');
    }
    return todayOrders.filter(order => order.status === filterStatus);
  }, [todayOrders, filterStatus]);

  // Contadores
  const counts = useMemo(() => {
    return {
      // Por Cobrar: entregadas sin pago Y entregadas con pago pendiente (rechazadas)
      entregado: todayOrders.filter(o =>
        (o.status === 'entregado' && !o.payment_method) ||
        (o.status === 'entregado' && o.payment_method)
      ).length,
      // En Verificación: solo las que están siendo verificadas por el cajero
      por_verificar: todayOrders.filter(o => o.status === 'por_verificar').length,
      pagado: todayOrders.filter(o => o.status === 'pagado').length,
    };
  }, [todayOrders]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'por_verificar':
        return 'bg-yellow-100 text-yellow-800 animate-pulse';
      case 'pagado':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col overflow-hidden">
      {/* Header - Fijo */}
      <div className="flex-shrink-0 bg-white shadow-md p-4 border-b-4 border-indigo-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">💳 Gestión de Pagos</h2>
        <p className="text-sm text-gray-600">Órdenes de hoy pendientes de cobro</p>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
            <p className="text-xs text-green-600 font-medium">Por Cobrar</p>
            <p className="text-xl font-bold text-green-700">{counts.entregado}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
            <p className="text-xs text-yellow-600 font-medium">En Verificación</p>
            <p className="text-xl font-bold text-yellow-700">{counts.por_verificar}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
            <p className="text-xs text-blue-600 font-medium">Pagadas</p>
            <p className="text-xl font-bold text-blue-700">{counts.pagado}</p>
          </div>
        </div>
      </div>

      {/* Filtros - Fijo */}
      <div className="flex-shrink-0 bg-white shadow-sm px-4 py-3 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('entregado')}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            filterStatus === 'entregado'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Cobrar ({counts.entregado})
        </button>
        <button
          onClick={() => setFilterStatus('por_verificar')}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            filterStatus === 'por_verificar'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          En Verificación ({counts.por_verificar})
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            filterStatus === 'all'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Lista de órdenes - OPTIMIZADO PARA MÓVILES */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
        {myOrdersStatus === 'loading' && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Cargando órdenes...</p>
          </div>
        )}

        {myOrdersStatus === 'succeeded' && filteredOrders.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-3">📭</div>
            <p className="text-gray-600">No hay órdenes {filterStatus !== 'all' && `con estado "${filterStatus}"`}</p>
          </div>
        )}

        {filteredOrders.map(order => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition-all"
          >
            {/* Header de la orden */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Mesa {order.table_number}</h3>
                  <p className="text-xs text-gray-600">
                    {new Date(order.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    ID: {order.id.substring(0, 8)}...
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">${order.total.toFixed(2)}</p>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadgeClass(order.status)}`}>
                      {order.status === 'por_verificar' && '⏳ '}
                      {order.status}
                    </span>
                    {(order.status === 'entregado' && order.payment_method) && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                        🔄 Pago Rechazado
                      </span>
                    )}
                    {(order.status === 'entregado' && !order.payment_method) && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                        ⚠️ Sin Cobrar
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen de items */}
            <div className="p-3 bg-gray-50 border-b">
              <p className="text-xs text-gray-600 font-semibold mb-1">Resumen de la orden:</p>
              {/* Mostrar nombre del cliente si es para llevar y existe */}
              {order.order_type === 'llevar' && order.customer_name && (
                <div className="mb-2 text-xs text-green-700 font-bold">
                  🧑 Cliente: {order.customer_name}
                </div>
              )}
              {/* Nota adicional si existe delivery_notes */}
              {order.delivery_notes && (
                <div className="mb-2 text-xs text-indigo-700 font-bold">
                  📝 Nota: {order.delivery_notes}
                </div>
              )}
              <div className="space-y-1">
                {(order.items || []).slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-gray-700">
                    <span>{item.quantity}x {item.menu_item_name}</span>
                    <span className="font-semibold">${(item.quantity * item.price_at_order).toFixed(2)}</span>
                  </div>
                ))}
                {(order.items?.length || 0) > 3 && (
                  <p className="text-xs text-gray-500 italic">+ {(order.items?.length || 0) - 3} items más...</p>
                )}
              </div>
            </div>

            {/* Info de pago */}
            {order.payment_method && (
              <div className="p-3 bg-blue-50 border-b">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xl">
                    {order.payment_method === 'transferencia' ? '📱' : '💵'}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {order.payment_method === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                  </span>
                  {order.payment_proof_path && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      ✓ Con comprobante
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="p-3 flex gap-2">
              <button
                onClick={() => onViewOrderDetails(order.id)}
                className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                👁️ Ver Detalles
              </button>

              {/* Botón para cobrar órdenes entregadas sin método de pago */}
              {order.status === 'entregado' && !order.payment_method && (
                <button
                  onClick={() => handleOpenCheckout(order.id, order.total, order.table_number)}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-bold text-sm shadow-md"
                >
                  💳 Cobrar
                </button>
              )}

              {/* Botón para reintentar pago en órdenes por verificar O entregadas con método de pago */}
              {(order.status === 'por_verificar' || (order.status === 'entregado' && order.payment_method)) && (
                <button
                  onClick={() => handleOpenCheckout(order.id, order.total, order.table_number)}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all font-bold text-sm shadow-md"
                >
                  🔄 Reintentar Pago
                </button>
              )}

              {/* Indicador visual para órdenes pagadas */}
              {order.status === 'pagado' && (
                <div className="flex-1 py-2 px-3 bg-blue-100 text-blue-800 rounded-lg text-center font-medium text-sm">
                  ✅ Pagado
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Checkout */}
      {selectedOrderForCheckout && (
        <CheckoutModal
          orderId={selectedOrderForCheckout.id}
          orderTotal={selectedOrderForCheckout.total}
          tableNumber={selectedOrderForCheckout.table}
          onClose={() => setSelectedOrderForCheckout(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default PaymentsSlide;

