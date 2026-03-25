import React, { useMemo, useState } from 'react';
import type { Order } from '../../../../types/orders';
import OrderGridView from '../../../shared/orders/components/OrderGridView';
import { QuickProofView } from './QuickProofView';
import { StationPrintModal } from './StationPrintModal';
import { formatMoney } from '../../../../utils/formatUtils';

interface ProofModalState {
  order: Order;
  relatedOrders?: Order[];
}

interface TableOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: number | null;
  orders: Order[];
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewDetail: (orderId: string) => void;
  onPrintCommand?: (orderId: string) => void;
  onPrintFullCommand?: (orderId: string) => void;
  onPreviewTickets?: (orderId: string) => void;
  onOpenCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onOpenCheckoutGroup: (orderIds: string[], total: number, tableNumber: number) => void;
  onCancelOrder: (orderId: string) => void;
}

export const TableOrdersModal: React.FC<TableOrdersModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  orders,
  onStatusChange,
  onConfirmPayment,
  onRejectPayment,
  onViewDetail,
  onOpenCheckout,
  onOpenCheckoutGroup,
  onCancelOrder,
}) => {
  const isPorCobrarStatus = (status: string) => status === 'entregado' || status === 'pendiente_aprobacion';
  const isPayableStatus = (status: string) => status === 'por_verificar' || isPorCobrarStatus(status);

  const handlePrintByStation = (orderId: string) => {
    setStationPrintOrderId(orderId);
  };

  const handleCancelOrder = (orderId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta orden? Esta acción no se puede deshacer fácilmente.')) {
      return;
    }
    onCancelOrder(orderId);
  };

  const getStatusVisual = (status: string) => {
    switch (status) {
      case 'por_verificar':
        return { icon: '⏳', label: 'Por Verificar', className: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'entregado':
      case 'pendiente_aprobacion':
        return { icon: '🧾', label: 'Por Cobrar', className: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'pagado':
        return { icon: '✅', label: 'Pagado', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'cancelado':
        return { icon: '⛔', label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-300' };
      default:
        return { icon: 'ℹ️', label: status, className: 'bg-gray-100 text-gray-700 border-gray-300' };
    }
  };

  const [selectedProofOrder, setSelectedProofOrder] = useState<ProofModalState | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'to_collect' | 'pending' | 'paid' | 'cancelled'>('to_collect');
  const [stationPrintOrderId, setStationPrintOrderId] = useState<string | null>(null);

  const orderMatchesTab = (order: Order) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'to_collect') return isPorCobrarStatus(order.status);
    if (filterTab === 'pending') return order.status === 'por_verificar';
    if (filterTab === 'paid') return order.status === 'pagado';
    if (filterTab === 'cancelled') return order.status === 'cancelado';
    return true;
  };

  const groupMatchesTab = (members: Order[]) => {
    if (filterTab === 'all') return true;
    return members.some((member) => orderMatchesTab(member));
  };

  // Filtrar órdenes individuales para contador/vistas simples
  const filteredOrders = orders.filter(orderMatchesTab);

  // Calcular estadísticas
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
  const toCollectCount = orders.filter(o => isPorCobrarStatus(o.status)).length;
  const pendingCount = orders.filter(o => o.status === 'por_verificar').length;
  const paidCount = orders.filter(o => o.status === 'pagado').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelado').length;
  const childCountMap = orders.reduce((acc, order) => {
    if (!order.parent_order_id) return acc;
    acc[order.parent_order_id] = (acc[order.parent_order_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const groupedFilteredOrders = useMemo(() => {
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
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return roots.map((root) => {
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
        payableMembers: members.filter((member) => isPayableStatus(member.status)),
      };
    }).map((group) => ({
      ...group,
      payableTotal: group.payableMembers.reduce((sum, current) => sum + current.total, 0),
    })).filter((group) => groupMatchesTab(group.members));
  }, [orders, filterTab]);

  if (!isOpen || !tableNumber) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 w-full h-full sm:max-w-4xl sm:max-h-[90vh] sm:rounded-2xl overflow-hidden flex flex-col text-gray-900" style={{ colorScheme: 'light' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🪑</span>
                <div>
                  <h2 className="text-2xl font-bold">Mesa {tableNumber}</h2>
                  <p className="text-sm opacity-90">{orders.length} órden{orders.length !== 1 ? 'es' : ''}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{formatMoney(totalAmount)}</p>
                <p className="text-xs text-white/90">Total</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{toCollectCount}</p>
                <p className="text-xs text-white/90">Por Cobrar</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-xs text-white/90">Por Verificar</p>
              </div>
              <div className="bg-white/20 rounded-lg p-2 text-center col-span-3 sm:col-span-1">
                <p className="text-2xl font-bold text-white">{paidCount}</p>
                <p className="text-xs text-white/90">Pagadas</p>
              </div>
              {cancelledCount > 0 && (
                <div className="bg-red-500/40 rounded-lg p-2 text-center col-span-3 mt-1">
                  <p className="text-lg font-bold text-white">{cancelledCount} ❌ Cancelada{cancelledCount !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pestañas de filtro */}
          <div className="bg-white border-b-2 border-gray-200 px-2 py-3 text-gray-900">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTab('all')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterTab === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Todas ({orders.length})
              </button>
              <button
                onClick={() => setFilterTab('to_collect')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterTab === 'to_collect'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🧾 Por Cobrar ({toCollectCount})
              </button>
              <button
                onClick={() => setFilterTab('pending')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterTab === 'pending'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚠️ Por Verificar ({pendingCount})
              </button>
              <button
                onClick={() => setFilterTab('paid')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterTab === 'paid'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Pagadas ({paidCount})
              </button>
              {cancelledCount > 0 && (
                <button
                  onClick={() => setFilterTab('cancelled')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    filterTab === 'cancelled'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ❌ Canceladas ({cancelledCount})
                </button>
              )}
            </div>
          </div>

          {/* Lista de órdenes */}
          <div className="flex-1 overflow-y-auto p-4 text-gray-900">
            {filteredOrders.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-6xl mb-4">📭</p>
                  <p className="text-gray-500 text-lg">No hay órdenes en esta categoría</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedFilteredOrders.map((group, groupIndex) => (
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
                    } ${groupIndex % 2 === 0 ? 'border-2 border-dashed' : 'border-solid'}`}
                  >
                    {group.isLinkedGroup && (
                      <div className="mb-3 px-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Grupo enlazado • {group.members.length} comandas (1 padre + {group.members.length - 1} hijas)
                          </p>
                          <p className="text-xs font-bold text-slate-900">Total a cobrar: {formatMoney(group.payableTotal)}</p>
                        </div>

                        {(() => {
                          const pendingGroupMembers = group.members.filter((member) => member.status === 'por_verificar');
                          const toCollectGroupMembers = group.members.filter((member) => isPorCobrarStatus(member.status));
                          const toCollectGroupTotal = toCollectGroupMembers.reduce((sum, member) => sum + member.total, 0);

                          if (pendingGroupMembers.length === 0 && toCollectGroupMembers.length === 0) return null;

                          return (
                            <div className="mt-2 space-y-2">
                              {pendingGroupMembers.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                                  <p className="text-[11px] font-semibold text-amber-800 mb-2">
                                    ⚠️ {pendingGroupMembers.length} comanda(s) del grupo pendiente(s) por verificar
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => {
                                        if (!window.confirm(`¿Aprobar ${pendingGroupMembers.length} comanda(s) del grupo?`)) return;
                                        pendingGroupMembers.forEach((member) => onConfirmPayment(member.id));
                                      }}
                                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-xs"
                                    >
                                      ✓ Aprobar Grupo
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!window.confirm(`¿Rechazar ${pendingGroupMembers.length} comanda(s) del grupo?`)) return;
                                        pendingGroupMembers.forEach((member) => onRejectPayment(member.id));
                                      }}
                                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-xs"
                                    >
                                      ✕ Rechazar Grupo
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => setSelectedProofOrder({ order: group.root, relatedOrders: group.members })}
                                    className="mt-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-xs"
                                  >
                                    🔍 Ver Comprobante Global + Individuales
                                  </button>
                                </div>
                              )}

                              {toCollectGroupMembers.length > 0 && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                                  <p className="text-[11px] font-semibold text-emerald-800 mb-2">
                                    💰 {toCollectGroupMembers.length} comanda(s) lista(s) para cobrar • Total {formatMoney(toCollectGroupTotal)}
                                  </p>
                                  <button
                                    onClick={() => {
                                      onOpenCheckoutGroup(
                                        toCollectGroupMembers.map((member) => member.id),
                                        toCollectGroupTotal,
                                        group.root.table_number,
                                      );
                                    }}
                                    className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-xs"
                                  >
                                    💳 Cobrar Grupo Completo
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {!group.isLinkedGroup && (
                      <div className="mb-3 px-1">
                        <p className="text-xs font-semibold text-emerald-700">Comanda individual</p>
                      </div>
                    )}

                    {group.isLinkedGroup ? (
                      <div className="relative pl-3">
                        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-indigo-300 to-violet-300" />
                        {group.members.map((member, memberIndex) => {
                          const isChild = !!member.parent_order_id;
                          const isParentWithChildren = (childCountMap[member.id] || 0) > 0;
                          const toneClass = isChild
                            ? 'bg-violet-50 border-violet-300 border-l-4 border-l-violet-500'
                            : isParentWithChildren
                            ? 'bg-sky-50 border-sky-300 border-l-4 border-l-sky-500'
                            : 'bg-emerald-50 border-emerald-300 border-l-4 border-l-emerald-500';

                          return (
                            <div
                              key={member.id}
                              className="relative"
                              style={{ marginLeft: `${memberIndex * 12}px` }}
                            >
                              {memberIndex > 0 && (
                                <span className="absolute -left-3 top-7 h-[2px] w-3 rounded-full bg-indigo-200" />
                              )}
                              <div className={`rounded-xl border p-2 shadow-sm ${toneClass} ${memberIndex % 2 === 0 ? 'border-2 border-dashed' : 'border-solid'}`}>
                              <div className="mb-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-white/80 text-slate-700 border border-slate-200">
                                  {memberIndex === 0 ? 'Comanda padre' : `Comanda hija ${memberIndex}`}
                                </span>
                              </div>
                              <OrderGridView
                                orders={[member]}
                                renderActions={(order) => (
                        <div className="space-y-2">
                    {(() => {
                      const statusVisual = getStatusVisual(order.status);
                      const childCount = childCountMap[order.id] || 0;
                      const hasGroupContext = !!order.parent_order_id || childCount > 0;
                      return (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${statusVisual.className}`}>
                              <span>{statusVisual.icon}</span>
                              <span>{statusVisual.label}</span>
                            </span>
                            {order.parent_order_id && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                                ↳ Adicional de {order.parent_order_id.slice(0, 8).toUpperCase()}
                              </span>
                            )}
                            {childCount > 0 && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                🔗 {childCount} adicional(es)
                              </span>
                            )}
                            {!hasGroupContext && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                                Comanda individual
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {order.status === 'por_verificar' ? (
                      <>
                        <button
                          onClick={() => setSelectedProofOrder({ order, relatedOrders: group.members })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-xl">🔍</span>
                          <span>Ver Comprobante</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onConfirmPayment(order.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md transition-all"
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => onRejectPayment(order.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md transition-all"
                          >
                            ✕ Rechazar
                          </button>
                        </div>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        <button
                          onClick={() => handlePrintByStation(order.id)}
                          className="w-full px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                        >
                          🖨️ Imprimir por Estaciones (incluye Caja)
                        </button>
                      </>
                    ) : order.status === 'pagado' ? (
                      <>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl text-center font-semibold">
                          ✓ Pagado Completamente
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            onClick={() => onViewDetail(order.id)}
                            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <span className="text-xl">📋</span>
                            <span>Ver Detalle</span>
                          </button>

                          <button
                            onClick={() => handlePrintByStation(order.id)}
                            className="px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                          >
                            🖨️ Imprimir por Estaciones (incluye Caja)
                          </button>
                        </div>
                      </>
                    ) : order.status === 'cancelado' ? (
                      <div className="space-y-2">
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-3 rounded-xl text-center font-semibold">
                          ❌ Orden Cancelada
                        </div>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                      </div>
                    ) : isPorCobrarStatus(order.status) ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => onOpenCheckout(order.id, order.total, order.table_number)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold shadow-md transition-all"
                        >
                          💰 Cobrar y Marcar Pagado
                        </button>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        <button
                          onClick={() => handlePrintByStation(order.id)}
                          className="w-full px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                        >
                          🖨️ Imprimir por Estaciones (incluye Caja)
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-all border border-red-200"
                        >
                          ❌ Cancelar Orden
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          onChange={(e) => onStatusChange(order.id, e.target.value)}
                          value={order.status}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800 bg-white"
                        >
                          <option value="pendiente_aprobacion">⏳ Pendiente</option>
                          <option value="recibido">📥 Recibido</option>
                          <option value="en_preparacion">👨‍🍳 En Preparación</option>
                          <option value="listo_para_servir">🍽️ Listo para Servir</option>
                          <option value="entregado">✅ Entregado</option>
                          <option value="pagado">💰 Pagado</option>
                        </select>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        <button
                          onClick={() => handlePrintByStation(order.id)}
                          className="w-full px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                        >
                          🖨️ Imprimir por Estaciones (incluye Caja)
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-all border border-red-200"
                        >
                          ❌ Cancelar Orden
                        </button>
                      </div>
                    )}
                  </div>
                                )}
                              />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                        <OrderGridView
                          orders={group.members}
                          renderActions={(order) => (
                            <div className="space-y-2">
                    {(() => {
                      const statusVisual = getStatusVisual(order.status);
                      const childCount = childCountMap[order.id] || 0;
                      const hasGroupContext = !!order.parent_order_id || childCount > 0;
                      return (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${statusVisual.className}`}>
                              <span>{statusVisual.icon}</span>
                              <span>{statusVisual.label}</span>
                            </span>
                            {order.parent_order_id && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                                ↳ Adicional de {order.parent_order_id.slice(0, 8).toUpperCase()}
                              </span>
                            )}
                            {childCount > 0 && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                🔗 {childCount} adicional(es)
                              </span>
                            )}
                            {!hasGroupContext && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                                Comanda individual
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {order.status === 'por_verificar' ? (
                      <>
                        <button
                          onClick={() => setSelectedProofOrder({ order, relatedOrders: group.members })}
                          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-xl">🔍</span>
                          <span>Ver Comprobante</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onConfirmPayment(order.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md transition-all"
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => onRejectPayment(order.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md transition-all"
                          >
                            ✕ Rechazar
                          </button>
                        </div>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        <button
                          onClick={() => handlePrintByStation(order.id)}
                          className="w-full px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                        >
                          🖨️ Imprimir por Estaciones (incluye Caja)
                        </button>
                      </>
                    ) : order.status === 'pagado' ? (
                      <>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl text-center font-semibold">
                          ✓ Pagado Completamente
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            onClick={() => onViewDetail(order.id)}
                            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <span className="text-xl">📋</span>
                            <span>Ver Detalle</span>
                          </button>

                          <button
                            onClick={() => handlePrintByStation(order.id)}
                            className="px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                          >
                            🖨️ Imprimir por Estaciones (incluye Caja)
                          </button>
                        </div>
                      </>
                    ) : order.status === 'cancelado' ? (
                      <div className="space-y-2">
                        <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-3 rounded-xl text-center font-semibold">
                          ❌ Orden Cancelada
                        </div>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                      </div>
                    ) : isPorCobrarStatus(order.status) ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => onOpenCheckout(order.id, order.total, order.table_number)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold shadow-md transition-all"
                        >
                          💰 Cobrar y Marcar Pagado
                        </button>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        <button
                          onClick={() => handlePrintByStation(order.id)}
                          className="w-full px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                        >
                          🖨️ Imprimir por Estaciones (incluye Caja)
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-all border border-red-200"
                        >
                          ❌ Cancelar Orden
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          onChange={(e) => onStatusChange(order.id, e.target.value)}
                          value={order.status}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800 bg-white"
                        >
                          <option value="pendiente_aprobacion">⏳ Pendiente</option>
                          <option value="recibido">📥 Recibido</option>
                          <option value="en_preparacion">👨‍🍳 En Preparación</option>
                          <option value="listo_para_servir">🍽️ Listo para Servir</option>
                          <option value="entregado">✅ Entregado</option>
                          <option value="pagado">💰 Pagado</option>
                        </select>
                        <button
                          onClick={() => onViewDetail(order.id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">📋</span>
                          <span>Ver Detalle Completo</span>
                        </button>
                        <button
                          onClick={() => handlePrintByStation(order.id)}
                          className="w-full px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold"
                        >
                          🖨️ Imprimir por Estaciones (incluye Caja)
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-all border border-red-200"
                        >
                          ❌ Cancelar Orden
                        </button>
                      </div>
                    )}
                  </div>
                                )}
                        />
                      </div>
                    )}


                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Impresión por Estación */}
      <StationPrintModal
        isOpen={stationPrintOrderId !== null}
        orderId={stationPrintOrderId}
        onClose={() => setStationPrintOrderId(null)}
      />

      {/* Modal de Comprobante */}
      {selectedProofOrder && (
        <QuickProofView
          order={selectedProofOrder.order}
          relatedOrders={selectedProofOrder.relatedOrders}
          onClose={() => setSelectedProofOrder(null)}
          onConfirm={(targetOrderId) => {
            onConfirmPayment(targetOrderId);
            setSelectedProofOrder(null);
          }}
          onReject={(targetOrderId) => {
            onRejectPayment(targetOrderId);
            setSelectedProofOrder(null);
          }}
        />
      )}
    </>
  );
};


