// =================================================================
// ARCHIVO: /src/features/waiter/components/ColleagueOrdersModal.tsx
// Modal para ver y cobrar comandas de otros meseros (solidaridad de equipo)
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders } from '../../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import { formatMoney } from '../../../utils/formatUtils.ts';
import type { Order } from '../../../types/orders';

interface ColleagueOrdersModalProps {
  onClose: () => void;
  onCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onCheckoutGroup?: (orderIds: string[], total: number, tableNumber: number) => void;
  onViewDetails: (orderId: string) => void;
  onSelectParentOrder?: (order: Order) => void;
}

const ColleagueOrdersModal: React.FC<ColleagueOrdersModalProps> = ({
  onClose,
  onCheckout,
  onCheckoutGroup,
  onViewDetails,
  onSelectParentOrder
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const currentWaiterId = useSelector((state: RootState) => state.auth.user?.id);

  const [tableFilter, setTableFilter] = useState<string>('');

  useEffect(() => {
    dispatch(fetchActiveOrders({ teamOrders: true }));
  }, [dispatch]);

  // Órdenes cobrables del equipo para el día actual
  const colleagueOrders = useMemo(() => {
    const getDayKey = (value: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(value);

    const todayKey = getDayKey(new Date());

    return (activeOrders || []).filter(order => {
      const isToday = getDayKey(new Date(order.created_at)) === todayKey;
      const isMesaOrder = (order.order_type || 'mesa') === 'mesa';
      const isPendingPayment =
        order.status === 'entregado' ||
        order.status === 'pendiente_aprobacion';
      return isToday && isMesaOrder && isPendingPayment;
    });
  }, [activeOrders]);

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    colleagueOrders.forEach((order) => map.set(order.id, order));
    return map;
  }, [colleagueOrders]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Order[]>();
    colleagueOrders.forEach((order) => {
      if (!order.parent_order_id) return;
      const children = map.get(order.parent_order_id) || [];
      children.push(order);
      map.set(order.parent_order_id, children);
    });

    map.forEach((children, parentId) => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      map.set(parentId, children);
    });

    return map;
  }, [colleagueOrders]);

  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    colleagueOrders.forEach((order) => {
      if (order.parent_order_id) {
        map.set(order.parent_order_id, (map.get(order.parent_order_id) || 0) + 1);
      }
    });
    return map;
  }, [colleagueOrders]);

  const rootOrders = useMemo(() => {
    return colleagueOrders
      .filter((order) => !order.parent_order_id || !orderById.has(order.parent_order_id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [colleagueOrders, orderById]);

  // Obtener lista única de mesas disponibles para los filtros rápidos
  const availableTables = useMemo(() => {
    const tables = [...new Set(colleagueOrders.map(o => o.table_number))].sort((a, b) => a - b);
    return tables;
  }, [colleagueOrders]);

  // Filtrado interactivo por mesa
  const filteredOrders = useMemo(() => {
    if (!tableFilter.trim()) return rootOrders;
    return rootOrders.filter(o => String(o.table_number).includes(tableFilter.trim()));
  }, [rootOrders, tableFilter]);

  const isMyOrder = (waiterId: string) => waiterId === currentWaiterId;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel del modal */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">

        {/* ---- HEADER ---- */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-4 pt-5 pb-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <span className="text-2xl">🤝</span>
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">Comandas de Compañeros</h2>
                <p className="text-violet-200 text-xs">
                  Órdenes por cobrar de todo el equipo — hoy
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            >
              <span className="text-xl font-bold">✕</span>
            </button>
          </div>

          {/* Contador */}
          <div className="mt-3 bg-white/15 rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-violet-100">Comandas por cobrar</span>
            <div className="flex items-center gap-3">
              <span className="bg-white text-violet-700 font-bold px-3 py-1 rounded-full text-sm">
                {colleagueOrders.length} {colleagueOrders.length === 1 ? 'comanda' : 'comandas'}
              </span>
            </div>
          </div>
        </div>

        {/* ---- FILTROS DE MESA ---- */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 space-y-2">
          {/* Input de búsqueda por número de mesa */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
            <input
              type="number"
              min="1"
              placeholder="Buscar por número de mesa..."
              value={tableFilter}
              onChange={e => setTableFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
            {tableFilter && (
              <button
                onClick={() => setTableFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            )}
          </div>

          {/* Botones de acceso rápido por mesa */}
          {availableTables.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setTableFilter('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !tableFilter
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas ({colleagueOrders.length})
              </button>
              {availableTables.map(table => {
                const count = colleagueOrders.filter(o => o.table_number === table).length;
                const isActive = tableFilter === String(table);
                return (
                  <button
                    key={table}
                    onClick={() => setTableFilter(isActive ? '' : String(table))}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Mesa {table} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- LISTA DE ÓRDENES ---- */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-br from-violet-50 to-purple-50 p-4 space-y-3">

          {/* Estado de carga */}
          {status === 'loading' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-violet-600 border-t-transparent mb-3"></div>
              <p className="text-gray-500 text-sm">Cargando comandas del equipo...</p>
            </div>
          )}

          {/* Sin resultados */}
          {status !== 'loading' && filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">
                {colleagueOrders.length === 0 ? '🎉' : '🔍'}
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-1">
                {colleagueOrders.length === 0
                  ? '¡Todo cobrado!'
                  : 'Sin resultados'}
              </p>
              <p className="text-gray-500 text-sm">
                {colleagueOrders.length === 0
                  ? 'No hay comandas pendientes de cobro en el equipo'
                  : `No hay comandas para la mesa "${tableFilter}"`}
              </p>
            </div>
          )}

          {/* Tarjetas de órdenes */}
          {filteredOrders.map(order => {
            const children = childrenByParent.get(order.id) || [];
            const groupOrders = [order, ...children];
            const payableOrders = groupOrders.filter(
              (current) => current.status === 'entregado' || current.status === 'pendiente_aprobacion'
            );
            const payableGroupTotal = payableOrders.reduce((sum, current) => sum + current.total, 0);
            const payableOrderIds = payableOrders.map((current) => current.id);

            const renderCard = (current: Order, isChild = false) => {
              const isPendingPayment = current.status === 'entregado' || current.status === 'pendiente_aprobacion';
              const isMy = isMyOrder(current.waiter_id);
              const statusLabel = current.status === 'pendiente_aprobacion' ? 'por_cobrar' : current.status;
              const childCount = childCountMap.get(current.id) || 0;

              return (
                <div
                  key={current.id}
                  className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all ${
                    isMy
                      ? 'border-indigo-300 ring-2 ring-indigo-100'
                      : 'border-violet-200 hover:border-violet-400'
                  } ${isChild ? 'border-dashed' : ''}`}
                >
                  <div className={`p-3 border-b ${
                    isMy
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50'
                      : 'bg-gradient-to-r from-violet-50 to-purple-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-800">Mesa {current.table_number}{isChild ? ' • Adicional' : ''}</h3>
                          {isMy && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                              Mía
                            </span>
                          )}
                        </div>
                        {current.waiter_name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>👤</span>
                            <span className="font-medium">{current.waiter_name}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(current.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-500 font-mono mt-1">
                          ID: {current.id.substring(0, 8).toUpperCase()}...
                        </p>
                        {(current.parent_order_id || childCount > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {current.parent_order_id && (
                              <button
                                type="button"
                                onClick={() => onViewDetails(current.parent_order_id as string)}
                                className="px-2 py-0.5 rounded text-[11px] bg-indigo-100 text-indigo-800 font-semibold hover:bg-indigo-200 transition-colors"
                                title="Ver comanda padre"
                              >
                                ↳ Adicional de {current.parent_order_id.substring(0, 8).toUpperCase()}
                              </button>
                            )}
                            {childCount > 0 && (
                              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800 font-semibold">
                                🔗 {childCount} comanda(s) adicional(es)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                          {current.status === 'por_verificar' ? '⏳ en_verificacion' : `⚠️ ${statusLabel}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 border-b">
                    <p className="text-xs text-gray-500 font-semibold mb-1.5">Resumen:</p>
                    {current.order_type === 'llevar' && current.customer_name && (
                      <p className="text-xs text-green-700 font-bold mb-1">🧑 {current.customer_name}</p>
                    )}
                    <div className="space-y-0.5">
                      {(current.items || []).slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-700">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          <span className="font-semibold">
                            {formatMoney(item.quantity * item.price_at_order)}
                          </span>
                        </div>
                      ))}
                      {(current.items?.length || 0) > 3 && (
                        <p className="text-xs text-gray-400 italic">
                          + {(current.items?.length || 0) - 3} items más...
                        </p>
                      )}
                    </div>
                  </div>

                  {current.payment_method && (
                    <div className="p-3 bg-blue-50 border-b">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-xl">
                          {current.payment_method === 'transferencia' ? '📱' : current.payment_method === 'mixto' ? '🔀' : '💵'}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {current.payment_method === 'transferencia' ? 'Transferencia' : current.payment_method === 'mixto' ? 'Mixto' : 'Efectivo'}
                        </span>
                        {current.payment_proof_path && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            ✓ Con comprobante
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-3 flex gap-2">
                    <button
                      onClick={() => onViewDetails(current.id)}
                      className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      👁️ Ver Detalles
                    </button>
                    {!isChild && isPendingPayment && !current.payment_method && (
                      <button
                        onClick={() => onCheckout(current.id, current.total, current.table_number)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl hover:from-violet-700 hover:to-purple-800 transition-all font-bold text-sm shadow-md active:scale-95"
                      >
                        💳 Cobrar
                      </button>
                    )}
                    {!isChild && (current.status === 'entregado' && current.payment_method) && (
                      <button
                        onClick={() => onCheckout(current.id, current.total, current.table_number)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all font-bold text-sm shadow-md active:scale-95"
                      >
                        🔄 Reintentar
                      </button>
                    )}
                  </div>

                  {onSelectParentOrder && !isChild && !current.parent_order_id && current.status !== 'cancelado' && (
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => onSelectParentOrder(current)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-bold text-sm shadow-md"
                      >
                        ➕ Adicionar a esta comanda
                      </button>
                    </div>
                  )}
                </div>
              );
            };

            if (children.length === 0) {
              return renderCard(order);
            }

            return (
              <div key={order.id} className="bg-violet-100 border border-violet-300 rounded-xl p-2.5 space-y-2">
                <div className="px-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-700">Grupo enlazado</p>
                </div>

                {onCheckoutGroup && payableOrderIds.length > 0 && (
                  <button
                    onClick={() => onCheckoutGroup(payableOrderIds, payableGroupTotal, order.table_number)}
                    className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl hover:from-violet-700 hover:to-purple-800 transition-all font-bold text-sm shadow-md active:scale-95"
                  >
                    {payableOrderIds.length > 1 ? '💳 Cobro Global del Grupo' : '💳 Cobrar Comanda Pendiente del Grupo'}
                  </button>
                )}

                {renderCard(order)}

                <div className="pl-4 border-l-2 border-violet-300 space-y-2">
                  {children.map((child) => (
                    <div key={child.id} className="relative">
                      <div className="absolute -left-4 top-7 w-4 border-t-2 border-violet-300" />
                      {renderCard(child, true)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </>
  );
};

export default ColleagueOrdersModal;
