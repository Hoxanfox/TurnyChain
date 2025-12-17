// =================================================================
// ARCHIVO 3: /src/features/waiter/components/MyOrdersList.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../../orders/ordersSlice';
import type { AppDispatch, RootState } from '../../../app/store';

interface MyOrdersListProps {
  onSelectOrder: (orderId: string) => void;
  filterByToday?: boolean; // Nueva prop para filtrar por hoy
}

const MyOrdersList: React.FC<MyOrdersListProps> = ({ onSelectOrder, filterByToday = false }) => {
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
          <button key={order.id} onClick={() => onSelectOrder(order.id)} className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <div className="flex justify-between font-semibold">
              <span>Mesa {order.table_number}</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600">
              <span>Estado: {order.status}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleString('es-ES')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MyOrdersList;
