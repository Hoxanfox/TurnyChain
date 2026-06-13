import React from 'react';
import type { Order } from '../../../../../types/orders';
import { getPaymentProofUrl } from '../../../../../utils/imageUtils';

interface CashierMobileUrgentListProps {
  orders: Order[];
  onConfirmPayment: (orderId: string) => void;
  onRejectPayment: (orderId: string) => void;
  onViewDetail: (orderId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const CashierMobileUrgentList: React.FC<CashierMobileUrgentListProps> = ({
  orders,
  onConfirmPayment,
  onRejectPayment,
  onViewDetail,
  hasMore,
  onLoadMore,
}) => {
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <p className="text-6xl mb-4">✅</p>
        <p className="text-gray-500 text-xl font-semibold">No hay pagos por verificar</p>
        <p className="text-gray-400 mt-2">¡Excelente trabajo!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-2xl shadow-lg p-4 border-2 border-orange-300">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪑</span>
                <h3 className="text-xl font-bold">Mesa {order.table_number}</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">Orden #{order.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-600">Mesero: {order.waiter_name || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">${order.total.toLocaleString('es-CO')}</p>
              <p className="text-xs text-gray-500">{order.payment_method === 'mixto' ? '🔀 Mixto' : order.payment_method === 'transferencia' ? '📱 Transf.' : order.payment_method === 'efectivo' ? '💵 Efectivo' : order.payment_method}</p>
            </div>
          </div>

          {/* ZONA DE INFORMACION DE PAGO */}
          {(order.payments && order.payments.length > 0) ? (
            <div className="bg-gray-50 p-3 rounded-xl mb-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Desglose de Pagos</p>
              <div className="space-y-2">
                {order.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.method === 'transferencia' ? '📱' : '💵'}</span>
                      <span className="text-sm font-semibold capitalize text-gray-700">{p.method}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-800">${p.amount.toLocaleString('es-CO')}</span>
                      {p.payment_proof_path && (
                        <button 
                          onClick={() => setSelectedImage(getPaymentProofUrl(p.payment_proof_path!))}
                          className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded font-bold transition-colors"
                        >
                          📸 Ver Foto
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : order.payment_method ? (
            <div className="bg-gray-50 p-3 rounded-xl mb-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Información de Pago</p>
              <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{order.payment_method === 'transferencia' ? '📱' : order.payment_method === 'mixto' ? '🔀' : '💵'}</span>
                  <span className="text-sm font-semibold capitalize text-gray-700">{order.payment_method}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800">${order.total.toLocaleString('es-CO')}</span>
                  {order.payment_proof_path && (
                    <button 
                       onClick={() => setSelectedImage(getPaymentProofUrl(order.payment_proof_path!))}
                       className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded font-bold transition-colors"
                    >
                      📸 Ver Foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => onConfirmPayment(order.id)}
              className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-md transition-all"
            >
              ✓ Confirmar Pago
            </button>
            <button
              onClick={() => onRejectPayment(order.id)}
              className="px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold shadow-md transition-all"
            >
              ✕ Rechazar
            </button>
          </div>
          <button
            onClick={() => onViewDetail(order.id)}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span className="text-lg">📋</span>
            <span>Ver Detalle</span>
          </button>
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full px-4 py-3 bg-white text-orange-700 rounded-xl font-semibold shadow hover:bg-orange-50 transition-colors"
        >
          Cargar mas urgentes
        </button>
      )}

      {/* Modal para ver imagen completa */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] cursor-pointer backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors text-4xl font-black z-10"
            >
              &times;
            </button>
            <img
              src={selectedImage}
              alt="Comprobante completo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
