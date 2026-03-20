import React, { useState } from 'react';
import type { Order } from '../../../types/orders';
import { getPaymentProofUrl } from '../../../utils/imageUtils';

interface QuickProofViewProps {
  order: Order;
  relatedOrders?: Order[];
  onConfirm: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onClose: () => void;
}

export const QuickProofView: React.FC<QuickProofViewProps> = ({
  order,
  relatedOrders,
  onConfirm,
  onReject,
  onClose
}) => {
  const proofOrders = (relatedOrders && relatedOrders.length > 0)
    ? relatedOrders
    : [order];
  const [activeOrderId, setActiveOrderId] = useState(order.id);

  const activeOrder = proofOrders.find((current) => current.id === activeOrderId) || order;
  const groupTotal = proofOrders.reduce((sum, current) => sum + current.total, 0);
  const globalOrder = proofOrders.find((current) => !current.parent_order_id) || proofOrders[0];
  const isGroupView = proofOrders.length > 1;

  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const imageUrl = activeOrder.payment_proof_path ? getPaymentProofUrl(activeOrder.payment_proof_path) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <div>
            <h3 className="text-xl font-bold">Verificar Comprobante</h3>
            <p className="text-sm text-gray-600">
              Mesa {activeOrder.table_number} • Total: ${activeOrder.total.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              👤 Mesero: {activeOrder.waiter_name || activeOrder.waiter_id.substring(0, 8)} •
              🕐 {new Date(activeOrder.created_at).toLocaleString('es-ES', {
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

        <div className="p-4">
          {isGroupView && (
            <div className="mb-4 p-4 rounded-lg border-2 border-indigo-200 bg-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-indigo-900">Pago global del grupo</h4>
                <span className="text-sm font-semibold text-indigo-700">{proofOrders.length} comandas</span>
              </div>
              <p className="text-sm text-indigo-800 mb-3">
                Total global: <span className="font-bold">${groupTotal.toFixed(2)}</span>
              </p>

              <div className="flex flex-wrap gap-2">
                {proofOrders.map((groupOrder, index) => {
                  const hasProof = !!groupOrder.payment_proof_path;
                  const isActive = groupOrder.id === activeOrder.id;
                  return (
                    <button
                      key={groupOrder.id}
                      type="button"
                      onClick={() => {
                        setActiveOrderId(groupOrder.id);
                        setImageError(false);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      {index === 0 ? 'Global (padre)' : `Individual ${index}`} {hasProof ? '✓' : '⚠'}
                    </button>
                  );
                })}
              </div>

              {globalOrder.payment_proof_path && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveOrderId(globalOrder.id);
                    setImageError(false);
                  }}
                  className="mt-3 px-3 py-2 text-xs font-semibold bg-white text-indigo-800 border border-indigo-300 rounded-lg hover:bg-indigo-100"
                >
                  🔍 Ver comprobante global
                </button>
              )}
            </div>
          )}

          {/* Tipo de Orden */}
          {activeOrder.order_type && (
            <div className={`mb-4 p-4 rounded-lg border-2 ${
              activeOrder.order_type === 'mesa' 
                ? 'bg-indigo-50 border-indigo-300'
                : activeOrder.order_type === 'llevar'
                ? 'bg-green-50 border-green-300'
                : 'bg-purple-50 border-purple-300'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {activeOrder.order_type === 'mesa' ? '🍽️' :
                   activeOrder.order_type === 'llevar' ? '🥡' : '🏍️'}
                </span>
                <div>
                  <p className={`font-bold text-lg ${
                    activeOrder.order_type === 'mesa' ? 'text-indigo-800' :
                    activeOrder.order_type === 'llevar' ? 'text-green-800' : 'text-purple-800'
                  }`}>
                    {activeOrder.order_type === 'mesa' ? 'Orden en Mesa' :
                     activeOrder.order_type === 'llevar' ? 'Orden Para Llevar' : 'Orden a Domicilio'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Mesa {activeOrder.table_number}
                    {activeOrder.order_type === 'llevar' && ' (Virtual 9999)'}
                    {activeOrder.order_type === 'domicilio' && ' (Virtual 9998)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Datos de Domicilio */}
          {activeOrder.order_type === 'domicilio' && activeOrder.delivery_address && (
            <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
              <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🏍️</span>
                Datos de Entrega
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">📍</span>
                  <div>
                    <p className="text-xs font-semibold text-purple-700">Dirección:</p>
                      <p className="text-sm text-gray-800">{activeOrder.delivery_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">📞</span>
                  <div>
                    <p className="text-xs font-semibold text-purple-700">Teléfono:</p>
                      <p className="text-sm text-gray-800">{activeOrder.delivery_phone}</p>
                  </div>
                </div>
                {activeOrder.delivery_notes && (
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">💬</span>
                    <div>
                      <p className="text-xs font-semibold text-purple-700">Notas:</p>
                      <p className="text-sm text-gray-800 italic">{activeOrder.delivery_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Información de pago */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm">
              <strong>Método de pago:</strong>{' '}
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold ml-2">
                {activeOrder.payment_method === 'transferencia' ? '📱 Transferencia' : '💵 Efectivo'}
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
                className="w-full rounded-lg border-2 border-gray-300 shadow-lg cursor-pointer hover:border-blue-500 transition-all"
                onClick={() => setShowFullImage(true)}
                onError={() => {
                  console.error('❌ Error cargando comprobante:', imageUrl);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log('✅ Comprobante cargado:', imageUrl);
                }}
              />
              <button
                onClick={() => setShowFullImage(true)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                🔍 Ver en tamaño completo
              </button>
              <p className="text-xs text-gray-500 mt-2">
                {activeOrder.payment_proof_path}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ No se pudo cargar el comprobante
              </p>
              {activeOrder.payment_proof_path && (
                <p className="text-xs text-gray-600 mt-1">
                  {activeOrder.payment_proof_path}
                </p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => onReject(activeOrder.id)}
              className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span className="text-xl">✕</span>
              <span>Rechazar</span>
            </button>
            <button
              onClick={() => onConfirm(activeOrder.id)}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span className="text-xl">✓</span>
              <span>Confirmar</span>
            </button>
          </div>

          {/* Items de la orden - Vista Detallada */}
          <div className="pt-4 border-t">
            <h4 className="font-bold text-lg mb-3">Items de la orden:</h4>
            <ul className="space-y-3">
              {(activeOrder.items || []).map((item, idx) => {
                const subtotal = item.price_at_order * item.quantity;
                const activeIngredients = item.customizations?.active_ingredients || [];
                const selectedAccompaniments = item.customizations?.selected_accompaniments || [];
                const hasCustomizations = activeIngredients.length > 0 || selectedAccompaniments.length > 0;

                return (
                  <li key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="font-semibold text-lg">
                            {item.quantity}x {item.menu_item_name}
                          </p>
                          <span className="text-sm text-gray-600">
                            @ ${item.price_at_order.toFixed(2)}
                          </span>
                        </div>

                        {/* Badge Para Llevar / Comer Aquí */}
                        {item.is_takeout !== undefined && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              item.is_takeout
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            }`}>
                              <span className="text-sm">{item.is_takeout ? '🥡' : '🍽️'}</span>
                              {item.is_takeout ? 'Para Llevar' : 'Comer Aquí'}
                            </span>
                          </div>
                        )}

                        <p className="text-base font-bold text-green-700 mt-1">
                          Subtotal: ${subtotal.toFixed(2)}
                        </p>

                        {/* Notas del item */}
                        {item.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-sm italic text-gray-700">
                              📝 <span className="font-medium">Nota:</span> {item.notes}
                            </p>
                          </div>
                        )}

                        {/* Customizaciones */}
                        {hasCustomizations && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              📋 Personalización:
                            </p>

                            {/* Ingredientes */}
                            {activeIngredients.length > 0 && (
                              <div className="p-2 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-300">
                                <p className="text-xs font-bold text-green-800 mb-1 flex items-center gap-1">
                                  🥬 Ingredientes:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {activeIngredients.map(ing => (
                                    <span
                                      key={ing.id}
                                      className="px-2 py-0.5 rounded-full text-xs bg-white text-green-700 font-medium"
                                    >
                                      ✓ {ing.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Acompañantes */}
                            {selectedAccompaniments.length > 0 && (
                              <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-300">
                                <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                                  🍽️ Acompañantes:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedAccompaniments.map(acc => (
                                    <span
                                      key={acc.id}
                                      className="px-2 py-0.5 rounded-full text-xs bg-white text-blue-700 font-medium"
                                    >
                                      ✓ {acc.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Total */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-2xl text-green-700">${activeOrder.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para imagen completa */}
      {showFullImage && imageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] cursor-pointer"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold hover:bg-gray-200 z-10"
            >
              ×
            </button>
            <img
              src={imageUrl}
              alt="Comprobante completo"
              className="max-w-full max-h-[95vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

