// =================================================================
// ARCHIVO 5: /src/features/waiter/components/MyOrdersList.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../../orders/ordersSlice';
import type { AppDispatch, RootState } from '../../../app/store';


interface MyOrdersListProps {
  onSelectOrder: (orderId: string) => void;
}

const MyOrdersList: React.FC<MyOrdersListProps> = ({ onSelectOrder }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { myOrders, myOrdersStatus } = useSelector((state: RootState) => state.orders);

  useEffect(() => {
    if (myOrdersStatus === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [myOrdersStatus, dispatch]);

  return (
    <div className="flex-grow pt-4 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Mis Órdenes Activas</h2>
      {myOrdersStatus === 'loading' && <p>Cargando mis órdenes...</p>}
      <div className="space-y-3">
        {myOrders.map(order => (
          <button key={order.id} onClick={() => onSelectOrder(order.id)} className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-gray-200">
            <div className="flex justify-between font-semibold">
              <span>Mesa {order.table_number}</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-600">
              <span>Estado: {order.status}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MyOrdersList;