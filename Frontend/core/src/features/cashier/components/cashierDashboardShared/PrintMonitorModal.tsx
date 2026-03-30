import React from 'react';
import type { Order } from '../../../../types/orders';

interface PrintMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onRetryPrint: (orderId: string) => void;
}

const getPrintMeta = (order: Order) => {
  if (order.print_status === 'printed') {
    return {
      color: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800',
      label: 'Impresa'
    };
  }

  if (order.print_status === 'failed') {
    return {
      color: 'bg-red-500',
      badge: 'bg-red-100 text-red-800',
      label: 'Fallo impresion'
    };
  }

  if (order.print_status === 'processing') {
    return {
      color: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-800',
      label: 'Procesando'
    };
  }

  return {
    color: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700',
    label: 'Pendiente'
  };
};

export const PrintMonitorModal: React.FC<PrintMonitorModalProps> = ({
  isOpen,
  onClose,
  orders,
  onRetryPrint,
}) => {
  if (!isOpen) {
    return null;
  }

  const monitoredOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const failedCount = monitoredOrders.filter((order) => order.print_status === 'failed').length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Monitoreo de impresion</h3>
            <p className="text-xs text-slate-500">
              {monitoredOrders.length} comandas en esta mesa · {failedCount} con fallo
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-3">
          {monitoredOrders.length === 0 && (
            <div className="rounded-xl border border-slate-200 p-5 text-center text-slate-500">
              No hay comandas para monitorear.
            </div>
          )}

          {monitoredOrders.map((order) => {
            const printMeta = getPrintMeta(order);
            return (
              <div key={order.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Mesa {order.table_number} · #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">Intentos: {order.print_attempts || 0}</p>
                  </div>

                  <span className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold ${printMeta.badge}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${printMeta.color}`} />
                    {printMeta.label}
                  </span>
                </div>

                {order.last_print_error && (
                  <p className="mt-2 rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-xs text-red-700">
                    Error: {order.last_print_error}
                  </p>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => onRetryPrint(order.id)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Reintentar impresion
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
