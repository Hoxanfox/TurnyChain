import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../app/store';
import type { Order } from '../../../../types/orders';
import { FailedPrintModal } from './FailedPrintModal';

const referenceTime = (order: Order) =>
  new Date(order.last_print_attempt_at || order.created_at).getTime();

const formatWaiting = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 1) return 'hace menos de 1 min';
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

export const FailedPrintQueue: React.FC = () => {
  const activeOrders = useSelector((state: RootState) => state.orders.activeOrders);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const queue = useMemo(
    () =>
      activeOrders
        .filter((order) => order.print_status === 'failed' && order.status !== 'cancelado')
        .sort((a, b) => referenceTime(a) - referenceTime(b)),
    [activeOrders]
  );

  return (
    <section className="bg-white rounded-2xl shadow-md border border-red-200 p-4 mt-4">
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🖨️</span>
          <div className="text-left">
            <h2 className="font-bold text-gray-900 text-base">Cola de impresión fallida</h2>
            <p className="text-xs text-gray-500">Comandas que esperan ser reimpresas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              queue.length > 0 ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {queue.length} esperando
          </span>
          <span className="text-gray-500 text-sm">{isCollapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!isCollapsed && (
        <div className="mt-4">
          {queue.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-emerald-700 font-semibold text-sm">✅ No hay comandas esperando impresión</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {queue.map((order, index) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  title={order.last_print_error || 'Sin detalle de error'}
                  className="flex-shrink-0 w-56 text-left rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-500 p-3 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-2xl" aria-hidden>🧍</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Mesa {order.table_number}</p>
                  <p className="text-xs text-gray-600 truncate">{order.waiter_name || 'Sin mesero'}</p>
                  <p className="text-xs text-red-700 font-semibold mt-1">
                    ⏱️ {formatWaiting(now - referenceTime(order))}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-white border border-red-200 text-[11px] font-bold text-red-700">
                      Intentos: {order.print_attempts ?? 0}
                    </span>
                    <span className="text-[11px] font-semibold text-red-600">Reimprimir ›</span>
                  </div>
                  {order.last_print_error && (
                    <p className="text-[11px] text-red-600 mt-2 line-clamp-2">{order.last_print_error}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FailedPrintModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </section>
  );
};
