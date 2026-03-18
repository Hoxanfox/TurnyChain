// =================================================================
// ARCHIVO: /src/features/waiter/slides/PaymentsSlide.tsx
// =================================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, fetchMyOrders } from '../../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import type { Order } from '../../../types/orders';
import { formatMoney } from '../../../utils/formatUtils.ts';

interface PaymentsSlideProps {
  onViewOrderDetails: (orderId: string) => void;
  onCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onCheckoutGroup?: (orderIds: string[], total: number, tableNumber: number) => void;
  onSelectParentOrder?: (order: Order) => void;
}

const FILTER_OPTIONS: Array<{ key: 'entregado' | 'por_verificar' | 'pagado' | 'cancelado' | 'all'; label: (counts: Record<string, number>) => string; activeClass: string }> = [
  { key: 'entregado', label: (c) => `Por Cobrar (${c.entregado})`, activeClass: 'bg-green-600 text-white shadow-lg' },
  { key: 'por_verificar', label: (c) => `En Verificación (${c.por_verificar})`, activeClass: 'bg-yellow-600 text-white shadow-lg' },
  { key: 'pagado', label: (c) => `Pagadas (${c.pagado})`, activeClass: 'bg-blue-600 text-white shadow-lg' },
  { key: 'cancelado', label: (c) => `❌ Canceladas (${c.cancelado})`, activeClass: 'bg-red-600 text-white shadow-lg' },
  { key: 'all', label: () => 'Todas', activeClass: 'bg-indigo-600 text-white shadow-lg' },
];

const normalizeStatusForFilter = (status: string): 'entregado' | 'por_verificar' | 'pagado' | 'cancelado' | null => {
  if (status === 'entregado' || status === 'pendiente_aprobacion') return 'entregado';
  if (status === 'por_verificar') return 'por_verificar';
  if (status === 'pagado') return 'pagado';
  if (status === 'cancelado') return 'cancelado';
  return null;
};

const resolveGroupFilterStatus = (orders: Order[]): 'entregado' | 'por_verificar' | 'pagado' | 'cancelado' => {
  const statusPriority: Array<'entregado' | 'por_verificar' | 'pagado' | 'cancelado'> = [
    'entregado',
    'por_verificar',
    'pagado',
    'cancelado',
  ];

  const normalized = orders
    .map((order) => normalizeStatusForFilter(order.status))
    .filter((status): status is 'entregado' | 'por_verificar' | 'pagado' | 'cancelado' => Boolean(status));

  if (normalized.length === 0) {
    return 'entregado';
  }

  const unique = Array.from(new Set(normalized));
  if (unique.length === 1) {
    return unique[0];
  }

  return normalized.reduce((current, next) =>
    statusPriority.indexOf(next) < statusPriority.indexOf(current) ? next : current
  );
};

const PaymentsSlide: React.FC<PaymentsSlideProps> = ({
  onViewOrderDetails,
  onCheckout,
  onCheckoutGroup,
  onSelectParentOrder
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { myOrders, myOrdersStatus, activeOrders, status: activeOrdersStatus } = useSelector((state: RootState) => state.orders);
  const currentWaiterId = useSelector((state: RootState) => state.auth.user?.id);
  const [filterStatus, setFilterStatus] = useState<'entregado' | 'por_verificar' | 'pagado' | 'all' | 'cancelado'>('entregado');
  const filterScrollRef = useRef<HTMLDivElement>(null);

  const scrollFilters = (direction: 'left' | 'right') => {
    if (filterScrollRef.current) {
      filterScrollRef.current.scrollBy({ left: direction === 'left' ? -130 : 130, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (myOrdersStatus === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [myOrdersStatus, dispatch]);

  useEffect(() => {
    if (activeOrdersStatus === 'idle') {
      dispatch(fetchActiveOrders({ teamOrders: true }));
    }
  }, [activeOrdersStatus, dispatch]);

  // Función para abrir el modal de checkout
  const handleOpenCheckout = (orderId: string, total: number, tableNumber: number) => {
    onCheckout(orderId, total, tableNumber);
  };

  const getDayKey = (value: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);

  // Filtrar por día actual usando zona horaria fija para evitar desfases UTC/local
  const myTodayOrders = useMemo(() => {
    const todayKey = getDayKey(new Date());
    return (myOrders || []).filter((order) => getDayKey(new Date(order.created_at)) === todayKey);
  }, [myOrders]);

  // Órdenes del equipo de hoy para completar grupos vinculados
  const teamTodayOrders = useMemo(() => {
    const todayKey = getDayKey(new Date());
    return (activeOrders || []).filter((order) => getDayKey(new Date(order.created_at)) === todayKey);
  }, [activeOrders]);

  // Construir contexto de grupo: mis órdenes + órdenes de compañeros vinculadas
  const groupContextOrders = useMemo(() => {
    const merged = new Map<string, Order>();
    myTodayOrders.forEach((order) => merged.set(order.id, order));

    const relevantIds = new Set<string>();
    myTodayOrders.forEach((order) => {
      relevantIds.add(order.id);
      if (order.parent_order_id) relevantIds.add(order.parent_order_id);
    });

    let changed = true;
    while (changed) {
      changed = false;
      teamTodayOrders.forEach((order) => {
        const parentId = order.parent_order_id || '';
        const isRelated = relevantIds.has(order.id) || (!!parentId && relevantIds.has(parentId));
        if (isRelated) {
          if (!relevantIds.has(order.id)) {
            relevantIds.add(order.id);
            changed = true;
          }
          if (parentId && !relevantIds.has(parentId)) {
            relevantIds.add(parentId);
            changed = true;
          }
        }
      });
    }

    teamTodayOrders.forEach((order) => {
      if (relevantIds.has(order.id)) {
        merged.set(order.id, order);
      }
    });

    return Array.from(merged.values());
  }, [myTodayOrders, teamTodayOrders]);

  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    groupContextOrders.forEach((order) => {
      if (order.parent_order_id) {
        map.set(order.parent_order_id, (map.get(order.parent_order_id) || 0) + 1);
      }
    });
    return map;
  }, [groupContextOrders]);

  // Contadores
  const counts = useMemo(() => {
    return {
      // Por Cobrar: entregadas/pedientes sin pago y también entregadas con pago rechazado
      entregado: myTodayOrders.filter(o =>
        ((o.status === 'entregado' || o.status === 'pendiente_aprobacion') && !o.payment_method) ||
        (o.status === 'entregado' && o.payment_method)
      ).length,
      // En Verificación: solo las que están siendo verificadas por el cajero
      por_verificar: myTodayOrders.filter(o => o.status === 'por_verificar').length,
      pagado: myTodayOrders.filter(o => o.status === 'pagado').length,
      cancelado: myTodayOrders.filter(o => o.status === 'cancelado').length,
    };
  }, [myTodayOrders]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'entregado':
      case 'pendiente_aprobacion':
        return 'bg-green-100 text-green-800';
      case 'por_verificar':
        return 'bg-yellow-100 text-yellow-800 animate-pulse';
      case 'pagado':
        return 'bg-blue-100 text-blue-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    groupContextOrders.forEach((order) => map.set(order.id, order));
    return map;
  }, [groupContextOrders]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Order[]>();

    groupContextOrders.forEach((order) => {
      if (!order.parent_order_id) return;
      const list = map.get(order.parent_order_id) || [];
      list.push(order);
      map.set(order.parent_order_id, list);
    });

    map.forEach((children, parentId) => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      map.set(parentId, children);
    });

    return map;
  }, [groupContextOrders]);

  const rootOrders = useMemo(() => {
    const getRootId = (order: Order): string => {
      let current: Order | undefined = order;
      const visited = new Set<string>();

      while (current?.parent_order_id && !visited.has(current.parent_order_id)) {
        visited.add(current.id);
        const parent = orderById.get(current.parent_order_id);
        if (!parent) break;
        current = parent;
      }

      return current?.id || order.id;
    };

    const rootIds = new Set<string>();
    myTodayOrders.forEach((order) => {
      rootIds.add(getRootId(order));
    });

    const roots = Array.from(rootIds)
      .map((id) => orderById.get(id))
      .filter((order): order is Order => Boolean(order))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (filterStatus === 'all') {
      return roots;
    }

    return roots.filter((rootOrder) => {
      const children = childrenByParent.get(rootOrder.id) || [];
      const groupOrders = [rootOrder, ...children];
      return resolveGroupFilterStatus(groupOrders) === filterStatus;
    });
  }, [myTodayOrders, orderById, filterStatus, childrenByParent]);

  const renderPaymentCard = (order: Order, isChild = false) => {
    const childCount = childCountMap.get(order.id) || 0;
    const isParentOrder = !order.parent_order_id;
    const isPorCobrar = order.status === 'entregado' || order.status === 'pendiente_aprobacion';
    const statusLabel = order.status === 'pendiente_aprobacion' ? 'por_cobrar' : order.status;
    const isColleagueOrder = !!currentWaiterId && order.waiter_id !== currentWaiterId;

    return (
      <div
        key={order.id}
        className={`rounded-lg shadow-md overflow-hidden border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.995] ${
          order.status === 'cancelado'
            ? 'border-red-300 hover:border-red-400'
            : 'border-gray-200 hover:border-indigo-400'
        } ${isChild ? 'border-dashed' : ''} ${isColleagueOrder ? 'bg-amber-50/70' : 'bg-white'}`}
      >
        {order.status === 'cancelado' && (
          <div className="bg-red-500 text-white text-xs font-bold text-center py-1">
            ❌ ORDEN CANCELADA
          </div>
        )}
        {/* Header de la orden */}
        <div className={`p-3 border-b ${isColleagueOrder ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-gradient-to-r from-indigo-50 to-blue-50'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-gray-800">Mesa {order.table_number}{isChild ? ' • Adicional' : ''}</h3>
              {isColleagueOrder && (
                <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Comanda de compañero</p>
              )}
              <p className="text-xs text-gray-600">
                {new Date(order.created_at).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                ID: {order.id.substring(0, 8)}...
              </p>
              {(order.parent_order_id || childCount > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {order.parent_order_id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOrderDetails(order.parent_order_id as string);
                      }}
                      className="px-2 py-0.5 rounded text-[11px] bg-indigo-100 text-indigo-800 font-semibold hover:bg-indigo-200 transition-colors"
                      title="Ver detalle de la comanda padre"
                    >
                      ↳ Adicional de {order.parent_order_id.substring(0, 8).toUpperCase()}
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
              <p className="text-2xl font-bold text-indigo-600">{formatMoney(order.total)}</p>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadgeClass(order.status)}`}>
                  {order.status === 'por_verificar' && '⏳ '}
                  {statusLabel}
                </span>
                {(order.status === 'entregado' && order.payment_method) && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                    🔄 Pago Rechazado
                  </span>
                )}
                {(isPorCobrar && !order.payment_method) && (
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
                <span className="font-semibold">{formatMoney(item.quantity * item.price_at_order)}</span>
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
          {!isChild && isPorCobrar && !order.payment_method && (
            <button
              onClick={() => handleOpenCheckout(order.id, order.total, order.table_number)}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-bold text-sm shadow-md"
            >
              💳 Cobrar
            </button>
          )}

          {/* Botón para reintentar pago en órdenes por verificar O entregadas con método de pago */}
          {!isChild && (order.status === 'por_verificar' || (order.status === 'entregado' && order.payment_method)) && (
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

          {/* Indicador visual para órdenes canceladas */}
          {order.status === 'cancelado' && (
            <div className="flex-1 py-2 px-3 bg-red-100 text-red-800 rounded-lg text-center font-medium text-sm">
              ❌ Cancelada
            </div>
          )}
        </div>

        {onSelectParentOrder && isParentOrder && order.status !== 'cancelado' && (
          <div className="px-3 pb-3">
            <button
              onClick={() => onSelectParentOrder(order)}
              className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-bold text-sm shadow-md"
            >
              ➕ Adicionar a esta comanda
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col overflow-hidden">
      {/* Header - Fijo */}
      <div className="flex-shrink-0 bg-white shadow-md p-4 border-b-4 border-indigo-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">💳 Gestión de Pagos</h2>
        <p className="text-sm text-gray-600">Órdenes de hoy pendientes de cobro</p>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-4 gap-2 mt-3">
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
            <p className="text-xs text-red-600 font-medium">Canceladas</p>
            <p className="text-xl font-bold text-red-700">{counts.cancelado}</p>
          </div>
        </div>
      </div>

      {/* Filtros - Fijo con navegación por botones (sin scroll táctil) */}
      <div className="flex-shrink-0 bg-white shadow-sm px-2 py-3 flex items-center gap-1">
        {/* Botón izquierda */}
        <button
          onClick={() => scrollFilters('left')}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center text-base font-bold transition-all select-none"
          aria-label="Desplazar filtros a la izquierda"
        >
          ‹
        </button>

        {/* Contenedor de filtros: overflow-hidden + sin touch scroll */}
        <div
          ref={filterScrollRef}
          className="flex-1 flex gap-2 overflow-hidden"
          style={{ touchAction: 'none', userSelect: 'none' }}
        >
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilterStatus(opt.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                filterStatus === opt.key
                  ? opt.activeClass
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label(counts)}
            </button>
          ))}
        </div>

        {/* Botón derecha */}
        <button
          onClick={() => scrollFilters('right')}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center text-base font-bold transition-all select-none"
          aria-label="Desplazar filtros a la derecha"
        >
          ›
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

        {myOrdersStatus === 'succeeded' && rootOrders.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-3">📭</div>
            <p className="text-gray-600">No hay órdenes {filterStatus !== 'all' && `con estado "${filterStatus}"`}</p>
          </div>
        )}

        {rootOrders.map((parentOrder) => {
          const children = childrenByParent.get(parentOrder.id) || [];
          const groupOrders = [parentOrder, ...children];
          const groupTotal = groupOrders.reduce((sum, current) => sum + current.total, 0);
          const payableOrderIds = groupOrders
            .filter((order) => order.status === 'entregado' || order.status === 'por_verificar' || order.status === 'pendiente_aprobacion')
            .map((order) => order.id);

          if (children.length === 0) {
            return renderPaymentCard(parentOrder);
          }

          return (
            <div key={parentOrder.id} className="group bg-slate-100 border border-slate-300 rounded-xl p-2.5 space-y-2 transition-all duration-200 hover:shadow-lg hover:border-indigo-300">
              <div className="px-1 flex items-center justify-between transition-colors duration-200 group-hover:text-indigo-900">
                <p className="text-xs font-semibold text-slate-700">Grupo de comandas enlazadas</p>
                <p className="text-xs font-bold text-slate-900">Total grupo: {formatMoney(groupTotal)}</p>
              </div>

              {onCheckoutGroup && payableOrderIds.length > 1 && (
                <button
                  onClick={() => onCheckoutGroup(payableOrderIds, groupTotal, parentOrder.table_number)}
                  className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all font-bold text-sm shadow-md"
                >
                  💳 Cobro Global del Grupo
                </button>
              )}

              {renderPaymentCard(parentOrder)}

              <div className="pl-4 border-l-2 border-slate-300 space-y-2">
                {children.map((child) => (
                  <div key={child.id} className="relative transition-transform duration-200 hover:translate-x-1">
                    <div className="absolute -left-4 top-7 w-4 border-t-2 border-slate-300 transition-colors duration-200 group-hover:border-indigo-300" />
                    {renderPaymentCard(child, true)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default PaymentsSlide;

