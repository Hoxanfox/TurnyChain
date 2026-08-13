import React, { useState } from 'react';
import type { Order } from '../../../../../types/orders';
import { QuickProofView } from '../../cashierDashboardShared/QuickProofView';
import { StationPrintModal } from '../../cashierDashboardShared/StationPrintModal';
import { PrintMonitorModal } from '../../cashierDashboardShared/PrintMonitorModal';
import { formatMoney } from '../../../../../utils/formatUtils';

interface ProofModalState {
  order: Order;
  relatedOrders?: Order[];
}

interface DesktopTableDetailViewProps {
  tableNumber: number;
  orders: Order[];
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewDetail: (orderId: string) => void;
  onOpenCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onOpenCheckoutGroup: (ordersInfo: { id: string, total: number }[], total: number, tableNumber: number) => void;
  onCancelOrder: (orderId: string) => void;
  onRetryPrint: (orderId: string) => void;
  onCloseTable?: () => void;
  highlightOrderId?: string | null;
}

export const DesktopTableDetailView: React.FC<DesktopTableDetailViewProps> = ({
  tableNumber,
  orders,
  onConfirmPayment,
  onRejectPayment,
  onViewDetail,
  onOpenCheckout,
  onOpenCheckoutGroup,
  onCancelOrder,
  onRetryPrint,
  onCloseTable,
  highlightOrderId = null,
}) => {
  const isPorCobrarStatus = (status: string) => status === 'entregado' || status === 'pendiente_aprobacion';
  const isPayableStatus = (status: string) => status === 'por_verificar' || isPorCobrarStatus(status);

  const [selectedProofOrder, setSelectedProofOrder] = useState<ProofModalState | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'to_collect' | 'pending' | 'paid' | 'cancelled'>('to_collect');
  const [stationPrintOrderId, setStationPrintOrderId] = useState<string | null>(null);
  const [isPrintMonitorOpen, setIsPrintMonitorOpen] = useState(false);

  const handlePrintByStation = (orderId: string) => {
    setStationPrintOrderId(orderId);
  };

  const handleCancelOrder = (orderId: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta orden? Esta acción no se puede deshacer.')) return;
    onCancelOrder(orderId);
  };

  const getStatusVisual = (status: string) => {
    switch (status) {
      case 'por_verificar': return { icon: '⏳', label: 'Por Verificar', className: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'entregado':
      case 'pendiente_aprobacion': return { icon: '🧾', label: 'Por Cobrar', className: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'pagado': return { icon: '✅', label: 'Pagado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'cancelado': return { icon: '⛔', label: 'Cancelado', className: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { icon: 'ℹ️', label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const orderMatchesTab = (order: Order) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'to_collect') return isPorCobrarStatus(order.status);
    if (filterTab === 'pending') return order.status === 'por_verificar';
    if (filterTab === 'paid') return order.status === 'pagado';
    if (filterTab === 'cancelled') return order.status === 'cancelado';
    return true;
  };

  const filteredOrders = orders.filter(orderMatchesTab);
  
  const stats = {
    pending: orders.filter((o) => o.status === 'por_verificar').length,
    toCollect: orders.filter((o) => isPorCobrarStatus(o.status)).length,
    paid: orders.filter((o) => o.status === 'pagado').length,
    total: orders.length,
  };

  // Agrupamiento simple
  const orderById = new Map<string, Order>();
  orders.forEach((o) => orderById.set(o.id, o));
  const childrenByParent = new Map<string, Order[]>();
  orders.forEach((o) => {
    if (!o.parent_order_id || !orderById.has(o.parent_order_id)) return;
    const list = childrenByParent.get(o.parent_order_id) || [];
    list.push(o);
    childrenByParent.set(o.parent_order_id, list);
  });

  const roots = filteredOrders.filter((o) => !o.parent_order_id || !orderById.has(o.parent_order_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const groupedOrders = roots.map((root) => {
    const members: Order[] = [root];
    const appendChildren = (parentId: string) => {
      const children = childrenByParent.get(parentId) || [];
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      children.forEach((child) => {
        members.push(child);
        appendChildren(child.id);
      });
    };
    appendChildren(root.id);
    return {
      root,
      members: members.filter(m => orderMatchesTab(m) || m.id === root.id), // Ensure root is always shown if it matched originally
      isLinkedGroup: members.length > 1,
      payableTotal: members.filter((m) => isPayableStatus(m.status)).reduce((sum, curr) => sum + curr.total, 0),
      hasPayable: members.some((m) => isPayableStatus(m.status)),
    };
  }).filter(group => group.members.some(orderMatchesTab));

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          {onCloseTable && (
            <button
              onClick={onCloseTable}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-2 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver a Mesas</span>
            </button>
          )}
          <h2 className="text-xl font-bold text-slate-800">
            Mesa {tableNumber}
          </h2>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold">
            {orders.length} órdenes
          </span>
        </div>
        
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${filterTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            Todas ({stats.total})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${filterTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'}`}
          >
            Verificar ({stats.pending})
          </button>
          <button
            onClick={() => setFilterTab('to_collect')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${filterTab === 'to_collect' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-blue-700 hover:bg-blue-50'}`}
          >
            Por Cobrar ({stats.toCollect})
          </button>
          <button
            onClick={() => setFilterTab('paid')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${filterTab === 'paid' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
          >
            Pagadas ({stats.paid})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
        {groupedOrders.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
            <span className="text-4xl block mb-2">🍽️</span>
            <p className="text-slate-500 font-medium text-sm">No hay órdenes en esta categoría.</p>
          </div>
        ) : (
          <div className="flex gap-6 h-full items-start min-w-max">
            {groupedOrders.map((group) => {
              const isHighlighted = group.root.id === highlightOrderId;
              return (
                <div 
                  key={group.root.id} 
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden flex flex-col w-96 shrink-0 ${isHighlighted ? 'border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200'}`}
                >
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-start shrink-0">
                    {group.isLinkedGroup && (
                      <div className="mb-2 w-full">
                        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                          <span className="text-indigo-500">🔗</span> Grupo Enlazado
                        </h3>
                        <p className="text-xs text-indigo-600 mb-2">{group.members.length} comandas</p>
                        {group.hasPayable && filterTab !== 'paid' && filterTab !== 'cancelled' && (
                          <button
                            onClick={() => onOpenCheckoutGroup(
                              group.members.filter(m => isPayableStatus(m.status)).map(m => ({ id: m.id, total: m.total })),
                              group.payableTotal,
                              tableNumber
                            )}
                            className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                          >
                            Cobrar Grupo ({formatMoney(group.payableTotal)})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="divide-y divide-slate-100">
                      {group.members.map((order) => {
                        const visual = getStatusVisual(order.status);
                        return (
                          <div key={order.id} className="p-4 bg-white">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-bold text-slate-800">Comanda #{order.id.slice(0, 8)}</p>
                                <p className="text-xs text-slate-500 font-medium">Mesero: {order.waiter_name || 'N/A'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-lg text-slate-800">{formatMoney(order.total)}</p>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${visual.className}`}>
                                  {visual.icon} {visual.label}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                              {order.status === 'por_verificar' ? (
                                <>
                                  <button
                                    onClick={() => setSelectedProofOrder({ order, relatedOrders: group.members })}
                                    className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors"
                                  >
                                    Ver Comprobante
                                  </button>
                                  <button
                                    onClick={() => onConfirmPayment(order.id)}
                                    className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
                                  >
                                    Aprobar Pago
                                  </button>
                                </>
                              ) : isPorCobrarStatus(order.status) ? (
                                <button
                                  onClick={() => onOpenCheckout(order.id, order.total, tableNumber)}
                                  className="w-full col-span-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                  Cobrar ({formatMoney(order.total)})
                                </button>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => onViewDetail(order.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                              >
                                📋 Detalle
                              </button>
                              {(order.status === 'pagado' || order.status === 'por_verificar' || isPorCobrarStatus(order.status)) && (
                                <button
                                  onClick={() => handlePrintByStation(order.id)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                >
                                  🖨️ Imprimir
                                </button>
                              )}
                              {order.status !== 'cancelado' && order.status !== 'pagado' && (
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors ml-auto"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProofOrder && (
        <QuickProofView
          order={selectedProofOrder.order}
          onClose={() => setSelectedProofOrder(null)}
          onConfirm={(targetOrderId: string) => {
            onConfirmPayment(targetOrderId);
            setSelectedProofOrder(null);
          }}
          onReject={(targetOrderId: string) => {
            onRejectPayment(targetOrderId);
            setSelectedProofOrder(null);
          }}
        />
      )}
      
      {stationPrintOrderId && (
        <StationPrintModal
          isOpen={true}
          onClose={() => setStationPrintOrderId(null)}
          orderId={stationPrintOrderId}
        />
      )}

      <PrintMonitorModal
        isOpen={isPrintMonitorOpen}
        onClose={() => setIsPrintMonitorOpen(false)}
        orders={orders}
        onRetryPrint={onRetryPrint}
      />
    </div>
  );
};
