import React, { useState } from 'react';
import type { Order } from '../../../types/orders';
import { getPaymentProofUrl } from '../../../utils/imageUtils';

interface QuickProofViewProps {
  order: Order;
  onConfirm: () => void;
  onReject: () => void;
  onClose: () => void;
}

export const QuickProofView: React.FC<QuickProofViewProps> = ({
  order,
  onConfirm,
  onReject,
  onClose
}) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = order.payment_proof_path ? getPaymentProofUrl(order.payment_proof_path) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Verificar Comprobante</h3>
            <p className="text-sm text-gray-600">
              Mesa {order.table_number} • Total: ${order.total.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              👤 Mesero: {order.waiter_name || order.waiter_id.substring(0, 8)} •
              🕐 {new Date(order.created_at).toLocaleString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-gray-600 hover:text-gray-900"
          >
            ×
          </button>
        </div>

        {/* Información de pago */}
        <div className="p-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm">
              <strong>Método de pago:</strong>{' '}
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold ml-2">
                {order.payment_method === 'transferencia' ? '📱 Transferencia' : '💵 Efectivo'}
              </span>
            </p>
          </div>

          {/* Imagen del comprobante */}
          {imageUrl && !imageError ? (
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">Comprobante:</p>
              <img
                src={imageUrl}
                alt="Comprobante de pago"
                className="w-full rounded-lg border-2 border-gray-300 shadow-lg"
                onError={() => {
                  console.error('❌ Error cargando comprobante:', imageUrl);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('✅ Comprobante cargado:', imageUrl);
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                {order.payment_proof_path}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ No se pudo cargar el comprobante
              </p>
              {order.payment_proof_path && (
                <p className="text-xs text-gray-600 mt-1">
                  {order.payment_proof_path}
                </p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={onReject}
              className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">✕</span>
              <span>Rechazar</span>
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">✓</span>
              <span>Confirmar</span>
            </button>
          </div>

          {/* Items de la orden */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold mb-2">Items de la orden:</h4>
            <ul className="space-y-2">
              {(order.items || []).map((item, idx) => (
                <li key={idx} className="text-sm flex justify-between">
                  <span>
                    {item.quantity}x {item.menu_item_name}
                  </span>
                  <span className="font-semibold">
                    ${(item.price_at_order * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t flex justify-between font-bold">
              <span>Total:</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

