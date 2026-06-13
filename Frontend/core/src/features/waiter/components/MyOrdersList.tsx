// =================================================================
// ARCHIVO 3: /src/features/waiter/components/MyOrdersList.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import { formatMoney } from '../../../utils/formatUtils.ts';
import type { Order } from '../../../types/orders';

interface MyOrdersListProps {
  onSelectOrder: (orderId: string) => void;
  onSelectParentOrder?: (order: Order) => void;
  onCheckout?: (orderId: string, total: number, tableNumber: number) => void;
  onCheckoutGroup?: (orderIds: string[], total: number, tableNumber: number) => void;
  filterByToday?: boolean; // Nueva prop para filtrar por hoy
}

const MyOrdersList: React.FC<MyOrdersListProps> = ({
  onSelectOrder,
  onSelectParentOrder,
  onCheckout,
  onCheckoutGroup,
  filterByToday = false
}) => {
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

  const getStatusClass = (status: string) => {
    if (status === 'entregado') return 'bg-green-100 text-green-800';
    if (status === 'pendiente_aprobacion') return 'bg-green-100 text-green-800';
    if (status === 'por_verificar') return 'bg-yellow-100 text-yellow-800';
    if (status === 'pagado') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-200 text-gray-700';
  };

  const getPrintSemaphore = (printStatus?: Order['print_status']) => {
    if (printStatus === 'printed') {
      return {
        color: 'bg-emerald-500',
        ring: 'ring-emerald-200',
        text: 'Impresa'
      };
    }

    if (printStatus === 'failed') {
      return {
        color: 'bg-red-500',
        ring: 'ring-red-200',
        text: 'Fallo impresion'
      };
    }

    if (printStatus === 'processing' || printStatus === 'printing') {
      return {
        color: 'bg-amber-500',
        ring: 'ring-amber-200',
        text: 'Imprimiendo'
      };
    }

    return {
      color: 'bg-amber-500',
      ring: 'ring-amber-200',
      text: 'En cola impresion'
    };
  };

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    filteredOrders.forEach((order) => map.set(order.id, order));
    return map;
  }, [filteredOrders]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Order[]>();
    filteredOrders.forEach((order) => {
      if (!order.parent_order_id) return;
      const parentChildren = map.get(order.parent_order_id) || [];
      parentChildren.push(order);
      map.set(order.parent_order_id, parentChildren);
    });

    map.forEach((children, parentId) => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      map.set(parentId, children);
    });

    return map;
  }, [filteredOrders]);

  const rootOrders = useMemo(() => {
    return filteredOrders
      .filter((order) => !order.parent_order_id || !orderById.has(order.parent_order_id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [filteredOrders, orderById]);

  const renderOrderCard = (order: Order, isChild = false) => (
    (() => {
      const isPayable = order.status === 'entregado' || order.status === 'por_verificar' || order.status === 'pendiente_aprobacion';
      const statusLabel = order.status === 'pendiente_aprobacion' ? 'por_cobrar' : order.status;
      const printSemaphore = getPrintSemaphore(order.print_status);

      return (
    <div className={`bg-white rounded-2xl overflow-hidden border shadow ${isChild ? 'border-gray-200' : 'border-gray-300'}`}>
      <button
        onClick={() => onSelectOrder(order.id)}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex justify-between font-semibold text-2xl md:text-2xl">
          <span className="text-xl md:text-2xl">Mesa {order.table_number}{isChild ? ' (Ticket Adicional)' : ''}</span>
          <span className="text-2xl">{formatMoney(order.total)}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className={`px-3 py-1 rounded-2xl text-sm font-medium ${getStatusClass(order.status)}`}>
            ✅ {statusLabel}
          </span>
          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${printSemaphore.color} ring-2 ${printSemaphore.ring}`} />
            {printSemaphore.text}
          </span>
          {order.payment_method && (
            <span className="text-xs">
              {order.payment_method === 'transferencia' ? '📱' : order.payment_method === 'mixto' ? '🔀' : '💵'}
            </span>
          )}
        </div>

        {order.print_status === 'failed' && order.last_print_error && (
          <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
            Error: {order.last_print_error}
          </p>
        )}

        {order.parent_order_id && (
          <div className="mt-2">
            <span className="px-3 py-1 rounded-xl text-sm bg-purple-100 text-purple-800 font-medium">
              Adicional de {order.parent_order_id.substring(0, 8)}
            </span>
          </div>
        )}

        <div className="text-xs text-gray-600 mt-3">
          {new Date(order.created_at).toLocaleString('es-ES')} • ID: {order.id.substring(0, 8)}...
        </div>
      </button>

      {isPayable && onCheckout && (
        <div className="px-4 pb-4 space-y-2">
          {order.status === 'por_verificar' && (
            <div className="w-full py-2 bg-yellow-100 text-yellow-800 rounded-md text-center text-xs font-medium border border-yellow-300">
              Pago pendiente de verificación
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
            {order.status === 'por_verificar' ? 'Reintentar Pago' : 'Procesar Pago'}
          </button>
        </div>
      )}

      {onSelectParentOrder && order.status !== 'cancelado' && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectParentOrder(order);
            }}
            className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all font-semibold text-sm shadow-md"
          >
            Usar Como Orden Padre
          </button>
        </div>
      )}
    </div>
      );
    })()
  );

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
        {rootOrders.map((parentOrder) => {
          const children = childrenByParent.get(parentOrder.id) || [];
          const groupOrders = [parentOrder, ...children];
          const payableOrders = groupOrders.filter(
            (order) => order.status === 'entregado' || order.status === 'por_verificar' || order.status === 'pendiente_aprobacion'
          );
          const payableTotal = payableOrders.reduce((sum, order) => sum + order.total, 0);
          const payableOrderIds = payableOrders.map((order) => order.id);

          return (
            <div key={parentOrder.id} className="bg-slate-100 border border-slate-300 rounded-2xl p-3 md:p-4 shadow-sm">
              {renderOrderCard(parentOrder)}

              {children.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-slate-300 space-y-3">
                  {children.map((child) => (
                    <div key={child.id} className="relative">
                      <div className="absolute -left-4 top-7 w-4 border-t-2 border-slate-300" />
                      {renderOrderCard(child, true)}
                    </div>
                  ))}

                  <div className="bg-white rounded-xl border border-slate-200 p-4 mt-1">
                    <div className="flex justify-between text-2xl font-bold text-gray-900">
                      <span>Total a Cobrar</span>
                      <span>{formatMoney(payableTotal)}</span>
                    </div>

                    {onCheckoutGroup && payableOrderIds.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheckoutGroup(payableOrderIds, payableTotal, parentOrder.table_number);
                        }}
                        className="w-full mt-3 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all font-semibold text-sm shadow-md"
                      >
                        {payableOrderIds.length > 1 ? '💳 Pago Global del Grupo' : '💳 Cobrar Comanda Pendiente del Grupo'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrdersList;
