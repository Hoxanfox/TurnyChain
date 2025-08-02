// =================================================================
// ARCHIVO 7: /src/features/cashier/CashierDashboard.tsx
// =================================================================
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, changeOrderStatus, orderAdded, orderUpdated } from '../orders/ordersSlice';
import type { AppDispatch, RootState } from '../../app/store';
import LogoutButton from '../../components/LogoutButton';
import OrderDetailModal from '../shared/OrderDetailModal';
import type { Order } from '../../types/orders';

const CashierDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const [tableFilter, setTableFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchActiveOrders());

    const ws = new WebSocket('ws://localhost:8080/ws');
    ws.onopen = () => console.log('Conectado al servidor de WebSockets');
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_PENDING_ORDER') {
            dispatch(orderAdded(message.payload as Order));
        } else if (message.type === 'ORDER_STATUS_UPDATED' || message.type === 'ORDER_MANAGED') {
            dispatch(orderUpdated(message.payload as Order));
        }
      } catch (error) { console.error('Error al parsear el mensaje del WebSocket:', error); }
    };
    ws.onclose = () => console.log('Desconectado del servidor de WebSockets');
    return () => { ws.close(); };
  }, [dispatch]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    dispatch(changeOrderStatus({ orderId, status: newStatus }));
  };

  const filteredOrders = useMemo(() => {
    if (!tableFilter) return activeOrders;
    return activeOrders.filter(order => order.table_number.toString().includes(tableFilter));
  }, [activeOrders, tableFilter]);

  return (
    <>
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
              <h1 className="text-3xl font-bold text-gray-800">Panel del Cajero</h1>
              <p className="text-gray-600">Gestión de órdenes activas.</p>
          </div>
          <LogoutButton />
        </header>
        <div className="mb-4">
          <input type="text" placeholder="Filtrar por mesa..." value={tableFilter} onChange={e => setTableFilter(e.target.value)} className="px-4 py-2 border rounded-lg w-full md:w-1/3"/>
        </div>
        <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {status === 'loading' && <p>Cargando órdenes...</p>}
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-lg">Mesa: {order.table_number}</p>
                <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{order.status}</span>
              </div>
              <p className="text-gray-700 text-xl">${order.total.toFixed(2)}</p>
              <div className="mt-4 space-y-2">
                <select onChange={(e) => handleStatusChange(order.id, e.target.value)} value={order.status} className="w-full px-3 py-2 border rounded-md">
                  <option value="pendiente_aprobacion">Pendiente</option>
                  <option value="recibido">Recibido</option>
                  <option value="en_preparacion">En Preparación</option>
                  <option value="listo_para_servir">Listo para Servir</option>
                  <option value="entregado">Entregado</option>
                </select>
                <button onClick={() => setSelectedOrderId(order.id)} className="w-full text-center px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Ver Detalle</button>
              </div>
            </div>
          ))}
        </main>
      </div>
      {selectedOrderId && <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </>
  );
};

export default CashierDashboard;