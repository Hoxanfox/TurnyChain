import React, { useMemo } from 'react';
import type { Order } from '../../../types/orders';
import OrderGridView from '../../shared/orders/components/OrderGridView';
import { formatMoney } from '../../../utils/formatUtils';

interface OrdersPanelProps {
  orders: Order[];
  selectedTable: number | null;
  isLoading: boolean;
  hasFailed?: boolean;
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewProof: (order: Order) => void;
  onViewDetail: (orderId: string) => void;
  onPrintCommand: (orderId: string) => void;
  onPrintFullCommand?: (orderId: string) => void;
  onPreviewTickets?: (orderId: string) => void;
  onRetryLoadOrders?: () => void;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  orders,
  selectedTable,
  isLoading,
  hasFailed,
  onStatusChange,
  onConfirmPayment,
  onRejectPayment,
  onViewProof,
  onViewDetail,
  onPrintCommand,
  onPrintFullCommand,
  onPreviewTickets: _onPreviewTickets,
  onRetryLoadOrders,
}) => {
  const isPorCobrarStatus = (status: string) => status === 'entregado' || status === 'pendiente_aprobacion';
  const handlePrintCashTicket = (orderId: string) => {
    if (onPrintFullCommand) {
      onPrintFullCommand(orderId);
      return;
    }
    window.alert('La impresión de Ticket Caja no está disponible en este contexto.');
  };

  const handlePrintByStation = (orderId: string) => {
    onPrintCommand(orderId);
  };

  const childCountMap = orders.reduce((acc, order) => {
    if (!order.parent_order_id) return acc;
    acc[order.parent_order_id] = (acc[order.parent_order_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const groupedOrders = useMemo(() => {
    const orderById = new Map<string, Order>();
    orders.forEach((order) => orderById.set(order.id, order));

    const childrenByParent = new Map<string, Order[]>();
    orders.forEach((order) => {
      if (!order.parent_order_id || !orderById.has(order.parent_order_id)) return;
      const list = childrenByParent.get(order.parent_order_id) || [];
      list.push(order);
      childrenByParent.set(order.parent_order_id, list);
    });

    childrenByParent.forEach((children, parentId) => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      childrenByParent.set(parentId, children);
    });

    const roots = orders
      .filter((order) => !order.parent_order_id || !orderById.has(order.parent_order_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const groups = roots.map((root) => {
      const members: Order[] = [root];

      const appendChildren = (parentId: string) => {
        const children = childrenByParent.get(parentId) || [];
        children.forEach((child) => {
          members.push(child);
          appendChildren(child.id);
        });
      };

      appendChildren(root.id);

      return {
        root,
        members,
        isLinkedGroup: members.length > 1,
        total: members.reduce((sum, current) => sum + current.total, 0),
      };
    });

    return groups;
  }, [orders]);

  const renderActions = (order: Order) => (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        {order.parent_order_id && (
          <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
            ↳ Adicional de {order.parent_order_id.slice(0, 8).toUpperCase()}
          </span>
        )}
        {(childCountMap[order.id] || 0) > 0 && (
          <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            🔗 {childCountMap[order.id]} adicional(es)
          </span>
        )}
      </div>

      {order.status === 'por_verificar' ? (
        <>
          <button
            onClick={() => onViewProof(order)}
            className="w-full px-3 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔍</span>
            <span>Verificar Comprobante</span>
          </button>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => onConfirmPayment(order.id)}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
            >
              ✓ Confirmar
            </button>
            <button
              onClick={() => onRejectPayment(order.id)}
              className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
            >
              ✕ Rechazar
            </button>
          </div>
        </>
      ) : order.status === 'pagado' ? (
        <>
          <div className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-center font-bold shadow-md">
            ✓ Pagado Completamente
          </div>
          <div className="grid grid-cols-1 gap-2 mt-2">
            <button
              onClick={() => onViewDetail(order.id)}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">📋</span>
              <span>Ver Detalle</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePrintCashTicket(order.id)}
                className="px-3 py-2 bg-white border-2 border-indigo-200 text-indigo-700 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 font-semibold transition-all flex items-center justify-center gap-1"
              >
                <span>🧾</span>
                <span className="text-xs">Ticket Caja</span>
              </button>
              <button
                onClick={() => handlePrintByStation(order.id)}
                className="px-3 py-2 bg-white border-2 border-purple-200 text-purple-700 rounded-lg hover:border-purple-300 hover:bg-purple-50 font-semibold transition-all flex items-center justify-center gap-1"
              >
                <span>🏪</span>
                <span className="text-xs">Por Estación</span>
              </button>
            </div>
          </div>
        </>
      ) : isPorCobrarStatus(order.status) ? (
        <>
          <div className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-center font-bold shadow-md">
            🧾 Pendiente por cobrar
          </div>
          <button
            onClick={() => onConfirmPayment(order.id)}
            className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
          >
            💰 Cobrar y Marcar Pagado
          </button>
          <button
            onClick={() => onViewDetail(order.id)}
            className="w-full px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Ver Detalle
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePrintCashTicket(order.id)}
              className="w-full px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50"
            >
              🧾 Ticket Caja
            </button>
            <button
              onClick={() => handlePrintByStation(order.id)}
              className="w-full px-3 py-2 bg-white border border-purple-200 text-purple-700 rounded-md hover:bg-purple-50"
            >
              🏪 Por Estación
            </button>
          </div>
        </>
      ) : (
        <>
          <select
            onChange={(e) => onStatusChange(order.id, e.target.value)}
            value={order.status}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="pendiente_aprobacion">Pendiente</option>
            <option value="recibido">Recibido</option>
            <option value="en_preparacion">En Preparación</option>
            <option value="listo_para_servir">Listo para Servir</option>
            <option value="entregado">Entregado</option>
            <option value="pagado">Pagado</option>
          </select>
          <button
            onClick={() => onViewDetail(order.id)}
            className="w-full text-center px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Ver Detalle
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePrintCashTicket(order.id)}
              className="w-full text-center px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50"
            >
              🧾 Ticket Caja
            </button>
            <button
              onClick={() => handlePrintByStation(order.id)}
              className="w-full text-center px-3 py-2 bg-white border border-purple-200 text-purple-700 rounded-md hover:bg-purple-50"
            >
              🏪 Por Estación
            </button>
          </div>
        </>
      )}
    </>
  );

  if (isLoading) {
    return (
      <div className="w-full md:w-3/4 overflow-y-auto">
        <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Cargando órdenes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasFailed) {
    return (
      <div className="w-full md:w-3/4 overflow-y-auto">
        <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
          <div className="text-center py-8">
            <div className="text-red-600 text-5xl mb-2">⚠️</div>
            <p className="text-red-600 font-semibold">Error al cargar las órdenes</p>
            <p className="text-gray-500 text-sm mt-1">Verifica tu conexión o intenta nuevamente</p>
            {onRetryLoadOrders && (
              <button
                onClick={onRetryLoadOrders}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                🔄 Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedTable) {
    return (
      <div className="w-full md:w-3/4 overflow-y-auto">
        <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">Seleccione una mesa para ver sus órdenes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-3/4 overflow-y-auto">
      <div className="space-y-4">
        {groupedOrders.map((group, groupIndex) => (
          <div
            key={group.root.id}
            className={`rounded-xl border p-3 ${
              group.isLinkedGroup
                ? groupIndex % 2 === 0
                  ? 'bg-slate-50 border-slate-300 shadow-sm'
                  : 'bg-slate-100 border-slate-400 shadow-sm'
                : groupIndex % 2 === 0
                ? 'bg-emerald-50/60 border-emerald-200 shadow-sm'
                : 'bg-cyan-50/60 border-cyan-200 shadow-sm'
            }`}
          >
            {group.isLinkedGroup && (
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-semibold text-slate-700">
                  Grupo enlazado • {group.members.length} comandas (1 padre + {group.members.length - 1} hijas)
                </p>
                <p className="text-xs font-bold text-slate-900">Total grupo: {formatMoney(group.total)}</p>
              </div>
            )}

            {!group.isLinkedGroup && (
              <div className="mb-3 px-1">
                <p className="text-xs font-semibold text-emerald-700">
                  Comanda individual
                </p>
              </div>
            )}

            {group.isLinkedGroup ? (
              <div className="relative pl-3">
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-indigo-300 to-violet-300" />
                {group.members.map((member, index) => {
                  const isChild = !!member.parent_order_id;
                  const isParentWithChildren = (childCountMap[member.id] || 0) > 0;
                  const toneClass = isChild
                    ? 'bg-violet-50 border-violet-200'
                    : isParentWithChildren
                    ? 'bg-indigo-50 border-indigo-200'
                    : 'bg-emerald-50 border-emerald-200';

                  return (
                    <div
                      key={member.id}
                      className="relative"
                      style={{ marginLeft: `${index * 12}px` }}
                    >
                      {index > 0 && (
                        <span className="absolute -left-3 top-7 h-[2px] w-3 rounded-full bg-indigo-200" />
                      )}
                      <div className={`rounded-xl border p-2 shadow-sm ${toneClass}`}>
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-white/80 text-slate-700 border border-slate-200">
                          {index === 0 ? 'Padre' : `Hija ${index}`}
                        </span>
                      </div>
                      <OrderGridView orders={[member]} renderActions={renderActions} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                <OrderGridView orders={group.members} renderActions={renderActions} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

