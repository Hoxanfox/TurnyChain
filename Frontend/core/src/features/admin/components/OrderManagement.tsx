// =================================================================
// ARCHIVO 3: /src/features/admin/components/OrderManagement.tsx (CORREGIDO)
// =================================================================
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, cancelOrderAsAdmin, orderAdded, orderUpdated } from '../../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import OrderDetailModal from '../../shared/orders/components/OrderDetailModal.tsx';
import OrderGridView from '../../shared/orders/components/OrderGridView.tsx';
import type { Order } from '../../../types/orders';

const OrderManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchActiveOrders());
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'NEW_PENDING_ORDER') {
        dispatch(orderAdded(message.payload as Order));
      } else if (['ORDER_STATUS_UPDATED', 'ORDER_MANAGED'].includes(message.type)) {
        dispatch(orderUpdated(message.payload as Order));
      }
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

  const handleCancel = (orderId: string) => {
    if (window.confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
      dispatch(cancelOrderAsAdmin(orderId));
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6" style={{ height: '60vh' }}>
        <div className="w-full md:w-1/4 bg-gray-50 p-4 rounded-lg border overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Mesas Activas</h2>
          <div className="space-y-2">
            {Object.keys(ordersByTable).map(tableNumStr => {
              const tableNum = Number(tableNumStr);
              return (
                <button
                  key={tableNum}
                  onClick={() => setSelectedTable(tableNum)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedTable === tableNum ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 hover:bg-gray-300'}`}
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

        <main className="w-full md:w-3/4 overflow-y-auto">
          {status === 'loading' && <p>Cargando órdenes...</p>}
          {selectedTable ? (
            <OrderGridView
              orders={ordersByTable[selectedTable]}
              renderActions={(order) => (
                <>
                  <button onClick={() => setSelectedOrderId(order.id)} className="w-full text-center px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Ver Detalle</button>
                  <button onClick={() => handleCancel(order.id)} className="w-full text-center px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">Cancelar Orden</button>
                </>
              )}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Seleccione una mesa para ver sus órdenes.</p>
            </div>
          )}
        </main>
      </div>
      {selectedOrderId && <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </>
  );
};

export default OrderManagement;
