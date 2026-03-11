// =================================================================
// ARCHIVO: /src/features/waiter/components/ColleagueOrdersModal.tsx
// Modal para ver y cobrar comandas de otros meseros (solidaridad de equipo)
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders } from '../../shared/orders/api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../app/store';
import { formatMoney } from '../../../utils/formatUtils.ts';

interface ColleagueOrdersModalProps {
  onClose: () => void;
  onCheckout: (orderId: string, total: number, tableNumber: number) => void;
  onViewDetails: (orderId: string) => void;
}

const ColleagueOrdersModal: React.FC<ColleagueOrdersModalProps> = ({ onClose, onCheckout, onViewDetails }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrders, status } = useSelector((state: RootState) => state.orders);
  const currentWaiterId = useSelector((state: RootState) => state.auth.user?.id);

  const [tableFilter, setTableFilter] = useState<string>('');

  useEffect(() => {
    dispatch(fetchActiveOrders());
  }, [dispatch]);

  // Solo órdenes "por cobrar" (entregado) de todos los meseros, hoy
  const colleagueOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (activeOrders || []).filter(order => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      const isToday = orderDate.getTime() === today.getTime();
      const isPendingPayment = order.status === 'entregado';
      return isToday && isPendingPayment;
    });
  }, [activeOrders]);

  // Obtener lista única de mesas disponibles para los filtros rápidos
  const availableTables = useMemo(() => {
    const tables = [...new Set(colleagueOrders.map(o => o.table_number))].sort((a, b) => a - b);
    return tables;
  }, [colleagueOrders]);

  // Filtrado interactivo por mesa
  const filteredOrders = useMemo(() => {
    if (!tableFilter.trim()) return colleagueOrders;
    return colleagueOrders.filter(o =>
      String(o.table_number).includes(tableFilter.trim())
    );
  }, [colleagueOrders, tableFilter]);

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
            <span className="text-sm font-medium text-violet-100">Total por cobrar</span>
            <div className="flex items-center gap-3">
              <span className="bg-white text-violet-700 font-bold px-3 py-1 rounded-full text-sm">
                {colleagueOrders.length} {colleagueOrders.length === 1 ? 'comanda' : 'comandas'}
              </span>
              {colleagueOrders.length > 0 && (
                <span className="text-white font-bold text-sm">
                  {formatMoney(colleagueOrders.reduce((sum, o) => sum + o.total, 0))}
                </span>
              )}
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
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className={`bg-white rounded-xl shadow-md overflow-hidden border-2 transition-all ${
                isMyOrder(order.waiter_id)
                  ? 'border-indigo-300 ring-2 ring-indigo-100'
                  : 'border-violet-200 hover:border-violet-400'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className={`p-3 border-b ${
                isMyOrder(order.waiter_id)
                  ? 'bg-gradient-to-r from-indigo-50 to-blue-50'
                  : 'bg-gradient-to-r from-violet-50 to-purple-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-800">Mesa {order.table_number}</h3>
                      {isMyOrder(order.waiter_id) && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                          Mía
                        </span>
                      )}
                    </div>
                    {order.waiter_name && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <span>👤</span>
                        <span className="font-medium">{order.waiter_name}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(order.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-violet-700">{formatMoney(order.total)}</p>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                      ⚠️ Sin Cobrar
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumen de items */}
              <div className="p-3 bg-gray-50 border-b">
                <p className="text-xs text-gray-500 font-semibold mb-1.5">Resumen:</p>
                {order.order_type === 'llevar' && order.customer_name && (
                  <p className="text-xs text-green-700 font-bold mb-1">🧑 {order.customer_name}</p>
                )}
                <div className="space-y-0.5">
                  {(order.items || []).slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-700">
                      <span>{item.quantity}x {item.menu_item_name}</span>
                      <span className="font-semibold">
                        {formatMoney(item.quantity * item.price_at_order)}
                      </span>
                    </div>
                  ))}
                  {(order.items?.length || 0) > 3 && (
                    <p className="text-xs text-gray-400 italic">
                      + {(order.items?.length || 0) - 3} items más...
                    </p>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="p-3 flex gap-2">
                <button
                  onClick={() => onViewDetails(order.id)}
                  className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  👁️ Ver Detalles
                </button>
                <button
                  onClick={() => onCheckout(order.id, order.total, order.table_number)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl hover:from-violet-700 hover:to-purple-800 transition-all font-bold text-sm shadow-md active:scale-95"
                >
                  💳 Cobrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </>
  );
};

export default ColleagueOrdersModal;
