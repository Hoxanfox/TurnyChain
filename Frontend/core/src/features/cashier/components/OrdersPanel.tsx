import React from 'react';
import type { Order } from '../../../types/orders';
import OrderGridView from '../../shared/orders/components/OrderGridView';

interface OrdersPanelProps {
  orders: Order[];
  selectedTable: number | null;
  isLoading: boolean;
  onStatusChange: (orderId: string, status: string) => void;
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewProof: (order: Order) => void;
  onViewDetail: (orderId: string) => void;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  orders,
  selectedTable,
  isLoading,
  onStatusChange,
  onConfirmPayment,
  onRejectPayment,
  onViewProof,
  onViewDetail,
}) => {
  if (isLoading) {
    return (
      <div className="w-full md:w-3/4 overflow-y-auto">
        <div className="flex items-center justify-center h-full bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">Cargando órdenes...</p>
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
      <OrderGridView
        orders={orders}
        renderActions={(order) => (
          <>
            {order.status === 'por_verificar' ? (
              // Acciones especiales para órdenes por verificar
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
              // Órdenes pagadas: Solo mostrar estado y botón de detalle
              <>
                <div className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-center font-bold shadow-md">
                  ✓ Pagado Completamente
                </div>
                <button
                  onClick={() => onViewDetail(order.id)}
                  className="w-full text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">📋</span>
                  <span>Ver Detalle Completo</span>
                </button>
              </>
            ) : (
              // Acciones normales para otras órdenes
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
              </>
            )}
          </>
        )}
      />
    </div>
  );
};

