// =================================================================
// ARCHIVO 5: /src/features/admin/components/OrderManagement.tsx (NUEVA UBICACIÓN)
// Propósito: Nueva vista para que el admin gestione todas las órdenes.
// =================================================================
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, cancelOrderAsAdmin, orderAdded, orderUpdated } from '../../orders/ordersSlice';
import type { AppDispatch, RootState } from '../../../app/store';
import OrderDetailModal from '../../shared/OrderDetailModal';
import type { Order } from '../../../types/orders';

const OrderManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const [tableFilter, setTableFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchActiveOrders());

    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'NEW_PENDING_ORDER') dispatch(orderAdded(message.payload as Order));
      else if (['ORDER_STATUS_UPDATED', 'ORDER_MANAGED'].includes(message.type)) dispatch(orderUpdated(message.payload as Order));
    };
    return () => { ws.close(); };
  }, [dispatch]);

  const handleCancel = (orderId: string) => {
    if (window.confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
      dispatch(cancelOrderAsAdmin(orderId));
    }
  };

  const filteredOrders = useMemo(() => {
    if (!tableFilter) return activeOrders;
    return activeOrders.filter(order => order.table_number.toString().includes(tableFilter));
  }, [activeOrders, tableFilter]);

  return (
    <>
      <div className="mb-4">
        <input type="text" placeholder="Filtrar por mesa..." value={tableFilter} onChange={e => setTableFilter(e.target.value)} className="px-4 py-2 border rounded-lg w-full md:w-1/3"/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {status === 'loading' && <p>Cargando órdenes...</p>}
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <p className="font-bold text-lg">Mesa: {order.table_number}</p>
              <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{order.status}</span>
            </div>
            <p className="text-gray-600 text-xs">Mesero: {order.waiter_id.substring(0, 8)}</p>
            <p className="text-gray-700 text-xl mt-1">${order.total.toFixed(2)}</p>
            <div className="mt-4 space-y-2">
              <button onClick={() => setSelectedOrderId(order.id)} className="w-full text-center px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Ver Detalle</button>
              <button onClick={() => handleCancel(order.id)} className="w-full text-center px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">Cancelar Orden</button>
            </div>
          </div>
        ))}
      </div>
      {selectedOrderId && <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </>
  );
};

export default OrderManagement;