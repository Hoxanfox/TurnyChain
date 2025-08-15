// =================================================================
// ARCHIVO 2: /src/features/cashier/CashierDashboard.tsx (REFACTORIZADO)
// =================================================================
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, changeOrderStatus, orderAdded, orderUpdated } from '../orders/ordersSlice';
import type { AppDispatch, RootState } from '../../app/store';
import LogoutButton from '../../components/LogoutButton';
import OrderDetailModal from '../shared/OrderDetailModal';
import OrderGridView from '../shared/OrderGridView';
import type { Order } from '../../types/orders';

const CashierDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
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

  const ordersByTable = useMemo(() => {
    if (!activeOrders) return {};
    return activeOrders.reduce((acc, order) => {
      const tableNum = order.table_number;
      if (!acc[tableNum]) {
        acc[tableNum] = [];
      }
      acc[tableNum].push(order);
      return acc;
    }, {} as Record<number, Order[]>);
  }, [activeOrders]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    dispatch(changeOrderStatus({ orderId, status: newStatus }));
  };

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
                    <select onChange={(e) => handleStatusChange(order.id, e.target.value)} value={order.status} className="w-full px-3 py-2 border rounded-md">
                      <option value="pendiente_aprobacion">Pendiente</option>
                      <option value="recibido">Recibido</option>
                      <option value="en_preparacion">En Preparación</option>
                      <option value="listo_para_servir">Listo para Servir</option>
                      <option value="entregado">Entregado</option>
                      <option value="pagado">Pagado</option>
                    </select>
                    <button onClick={() => setSelectedOrderId(order.id)} className="w-full text-center px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Ver Detalle</button>
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
    </>
  );
};

export default CashierDashboard;