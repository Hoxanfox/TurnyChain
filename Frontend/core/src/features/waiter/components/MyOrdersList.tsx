// =================================================================
// ARCHIVO 3: /src/features/waiter/components/MyOrdersList.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';

interface MyOrdersListProps {
  onSelectOrder: (orderId: string) => void;
  onCheckout?: (orderId: string, total: number, tableNumber: number) => void;
  filterByToday?: boolean; // Nueva prop para filtrar por hoy
}

const MyOrdersList: React.FC<MyOrdersListProps> = ({ onSelectOrder, onCheckout, filterByToday = false }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { myOrders, myOrdersStatus } = useSelector((state: RootState) => state.orders);

  useEffect(() => {
    if (myOrdersStatus === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [myOrdersStatus, dispatch]);

  // Filtrar órdenes por fecha si filterByToday es true
  const filteredOrders = useMemo(() => {
    if (!filterByToday) {
      return myOrders || [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (myOrders || []).filter(order => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });
  }, [myOrders, filterByToday]);

  const title = filterByToday ? 'Mis Órdenes de Hoy' : 'Historial de Órdenes';

  return (
    <div className="flex-grow pt-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
      {myOrdersStatus === 'loading' && <p>Cargando mis órdenes...</p>}
      {myOrdersStatus === 'succeeded' && filteredOrders.length === 0 && (
        <p className="text-gray-500 text-center py-4">
          {filterByToday ? 'No tienes órdenes para hoy' : 'No tienes órdenes'}
        </p>
      )}
      <div className="space-y-3 overflow-y-auto" style={{maxHeight: 'calc(100vh - 150px)'}}>
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => onSelectOrder(order.id)}
              className="w-full text-left p-3 hover:bg-gray-200 transition-colors"
            >
              <div className="flex justify-between font-semibold">
                <span>Mesa {order.table_number}</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  order.status === 'entregado' 
                    ? 'bg-green-100 text-green-800'
                    : order.status === 'por_verificar'
                    ? 'bg-yellow-100 text-yellow-800'
                    : order.status === 'pagado'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {order.status}
                </span>
                {order.payment_method && (
                  <span className="text-xs">
                    {order.payment_method === 'transferencia' ? '📱' : '💵'}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(order.created_at).toLocaleString('es-ES')}
              </div>
            </button>

            {/* Botón de Checkout para órdenes entregadas o por verificar */}
            {(order.status === 'entregado' || order.status === 'por_verificar') && onCheckout && (
              <div className="px-3 pb-3 space-y-2">
                {order.status === 'por_verificar' && (
                  <div className="w-full py-2 bg-yellow-100 text-yellow-800 rounded-md text-center text-xs font-medium border border-yellow-300">
                    ⚠️ Pago pendiente de verificación
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckout(order.id, order.total, order.table_number);
                  }}
                  className={`w-full py-2 text-white rounded-md hover:opacity-90 transition-all font-semibold text-sm shadow-md ${
                    order.status === 'por_verificar' 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {order.status === 'por_verificar' ? '🔄 Reintentar Pago' : '💳 Procesar Pago'}
                </button>
              </div>
            )}

            {/* Indicador de pago ya procesado */}
            {order.payment_method && order.status !== 'por_verificar' && (
              <div className="px-3 pb-3">
                <div className="w-full py-2 bg-green-100 text-green-800 rounded-md text-center text-sm font-medium border border-green-300">
                  ✅ Pago procesado
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrdersList;
