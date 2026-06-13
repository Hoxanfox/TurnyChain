import React, { useState } from 'react';
import type { Order } from '../../../../types/orders';
import { getPaymentProofUrl } from '../../../../utils/imageUtils';

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
  const isPayableStatus = (status: string) =>
    status === 'por_verificar' || status === 'entregado' || status === 'pendiente_aprobacion';
  const getStatusTone = (status: string) => {
    if (status === 'pagado') return 'bg-green-100 text-green-900 border-green-300';
    if (status === 'cancelado') return 'bg-red-100 text-red-900 border-red-300';
    if (status === 'por_verificar') return 'bg-amber-100 text-amber-900 border-amber-300';
    return 'bg-indigo-100 text-indigo-900 border-indigo-300';
  };
  const getStatusLabel = (status: string) => {
    if (status === 'pagado') return 'Pagado';
    if (status === 'cancelado') return 'Cancelado';
    if (status === 'por_verificar') return 'Por verificar';
    if (status === 'entregado' || status === 'pendiente_aprobacion') return 'Por cobrar';
    return status;
  };

  const proofOrders = (relatedOrders && relatedOrders.length > 0)
    ? relatedOrders
    : [order];
  const cancelledOrdersCount = proofOrders.filter((current) => current.status === 'cancelado').length;
  const proofRequiredOrders = proofOrders.filter((current) => current.status !== 'cancelado');
  const totalProofs = proofRequiredOrders.filter((current) => !!current.payment_proof_path).length;
  const [activeOrderId, setActiveOrderId] = useState(
    proofRequiredOrders.find((current) => !!current.payment_proof_path)?.id || proofRequiredOrders[0]?.id || order.id
  );

  const activeOrder = proofOrders.find((current) => current.id === activeOrderId) || order;
  const groupTotal = proofOrders
    .filter((current) => isPayableStatus(current.status))
    .reduce((sum, current) => sum + current.total, 0);
  const isGroupView = proofOrders.length > 1;
  const activeStatusTone = getStatusTone(activeOrder.status);

  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [selectedPaymentImage, setSelectedPaymentImage] = useState<string | null>(null);
  const imageUrl = activeOrder.payment_proof_path ? getPaymentProofUrl(activeOrder.payment_proof_path) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-gray-100 px-5 py-4 flex justify-between items-start z-10">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Verificar Comprobante</h3>
            <p className="text-sm text-gray-600 mt-1">
              Mesa {activeOrder.table_number} • Total: ${activeOrder.total.toLocaleString('es-CO')}
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
            className="w-9 h-9 rounded-full border border-gray-300 text-xl font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 md:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Total comanda activa</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">${activeOrder.total.toLocaleString('es-CO')}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 md:col-span-1 ${activeStatusTone}`}>
              <p className="text-xs font-semibold uppercase tracking-wide">Estado</p>
              <p className="text-lg font-bold mt-1">{getStatusLabel(activeOrder.status)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 md:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Método principal</p>
              <p className="text-base font-bold text-blue-900 mt-1">
                {activeOrder.payment_method === 'transferencia' ? '📱 Transferencia' : activeOrder.payment_method === 'mixto' ? '🔀 Mixto' : '💵 Efectivo'}
              </p>
            </div>
          </div>

          {/* Desglose de pagos múltiples */}
          {activeOrder.payments && activeOrder.payments.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 mb-3">Desglose de transacciones</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeOrder.payments.map((p, idx) => {
                  const pImgUrl = p.payment_proof_path ? getPaymentProofUrl(p.payment_proof_path) : null;
                  return (
                    <div key={idx} className="bg-white rounded-lg border border-blue-100 p-3 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                          {p.method === 'transferencia' ? '📱' : '💵'} <span className="capitalize">{p.method}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(p.created_at || activeOrder.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="font-bold text-blue-900">${p.amount.toLocaleString('es-CO')}</p>
                        {pImgUrl && (
                          <button
                            onClick={() => {
                              setSelectedPaymentImage(pImgUrl);
                              setShowFullImage(true);
                            }}
                            className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded font-bold transition-colors shadow-sm"
                          >
                            📸 Ver Foto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isGroupView && (
            <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/80 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3">
                  <h4 className="text-base font-bold text-indigo-900">Pago global del grupo</h4>
                  <p className="text-xs text-indigo-700 mt-1">{proofOrders.length} comandas enlazadas</p>
                </div>
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left md:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Total a cobrar</p>
                  <p className="text-2xl font-extrabold text-emerald-900 mt-1">${groupTotal.toLocaleString('es-CO')}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Resumen de comprobantes</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-700">📄 Requeridos: <strong>{totalProofs}/{proofRequiredOrders.length}</strong></span>
                  <span className="text-amber-700">⚠️ Sin comprobante: <strong>{proofRequiredOrders.length - totalProofs}</strong></span>
                  {cancelledOrdersCount > 0 && (
                    <span className="text-rose-700">⛔ Canceladas: <strong>{cancelledOrdersCount}</strong></span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-indigo-100 bg-white p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500 mb-2">Ordenes del grupo</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {proofOrders.map((groupOrder, index) => {
                  const hasProof = !!groupOrder.payment_proof_path;
                  const isActive = groupOrder.id === activeOrder.id;
                  const statusTone = getStatusTone(groupOrder.status);
                  const isCancelled = groupOrder.status === 'cancelado';
                  return (
                    <button
                      key={groupOrder.id}
                      type="button"
                      onClick={() => {
                        setActiveOrderId(groupOrder.id);
                        setImageError(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${statusTone} ${
                        isActive ? 'ring-2 ring-offset-1 ring-indigo-500 shadow-sm' : 'hover:brightness-95'
                      }`}
                    >
                      <span className="font-bold">{index === 0 ? 'Global (padre)' : `Individual ${index}`}</span>
                      <span className="mx-1">•</span>
                      <span>{getStatusLabel(groupOrder.status)}</span>
                      <span className="ml-1">{isCancelled ? '⛔' : hasProof ? '📄' : '⚠️'}</span>
                    </button>
                  );
                })}
                </div>
              </div>
            </div>
          )}

          {/* Tipo de Orden */}
          {activeOrder.order_type && (
            <div className={`p-4 rounded-xl border-2 ${
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
            <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-xl">
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

          {/* Imagen del comprobante principal (Legacy, solo si no hay array de payments o si se sigue usando payment_proof_path directo) */}
          {(!activeOrder.payments || activeOrder.payments.length === 0) && (
            activeOrder.status === 'cancelado' ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800 font-semibold">
                  ⛔ Esta comanda está cancelada y no requiere comprobante.
                </p>
              </div>
            ) : imageUrl && !imageError ? (
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                <p className="text-sm font-semibold mb-2">Comprobante principal:</p>
                <img
                  src={imageUrl}
                  alt="Comprobante de pago"
                  className="w-full rounded-lg border-2 border-gray-300 shadow-lg cursor-pointer hover:border-blue-500 transition-all"
                  onClick={() => {
                    setSelectedPaymentImage(imageUrl);
                    setShowFullImage(true);
                  }}
                  onError={() => {
                    console.error('❌ Error cargando comprobante:', imageUrl);
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log('✅ Comprobante cargado:', imageUrl);
                  }}
                />
                <button
                  onClick={() => {
                    setSelectedPaymentImage(imageUrl);
                    setShowFullImage(true);
                  }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  🔍 Ver en tamaño completo
                </button>
                <p className="text-xs text-gray-500 mt-2 break-all">
                  {activeOrder.payment_proof_path}
                </p>
              </div>
            ) : imageUrl && imageError ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800">
                  ⚠️ No se pudo cargar el comprobante principal
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {activeOrder.payment_proof_path}
                </p>
              </div>
            ) : null
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3">
            {activeOrder.status === 'por_verificar' ? (
              <>
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
              </>
            ) : activeOrder.status === 'pagado' ? (
              <div className="col-span-2 px-4 py-3 bg-green-100 text-green-900 border border-green-300 rounded-lg font-semibold text-center">
                ✅ Esta comanda ya está pagada.
              </div>
            ) : activeOrder.status === 'cancelado' ? (
              <div className="col-span-2 px-4 py-3 bg-red-100 text-red-900 border border-red-300 rounded-lg font-semibold text-center">
                ⛔ Esta comanda fue cancelada.
              </div>
            ) : (
              <div className="col-span-2 px-4 py-3 bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg font-semibold text-center">
                ℹ️ Esta comanda no requiere verificación en este estado.
              </div>
            )}
          </div>

          {/* Items de la orden - Vista Detallada */}
          <div className="pt-5 border-t-2 border-gray-100">
            <h4 className="font-bold text-lg mb-4">Items de la orden:</h4>
            <ul className="space-y-3">
              {(activeOrder.items || []).map((item, idx) => {
                const subtotal = item.price_at_order * item.quantity;
                const activeIngredients = item.customizations?.active_ingredients || [];
                const selectedAccompaniments = item.customizations?.selected_accompaniments || [];
                const hasCustomizations = activeIngredients.length > 0 || selectedAccompaniments.length > 0;

                return (
                  <li key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="font-semibold text-lg">
                            {item.quantity}x {item.menu_item_name}
                          </p>
                          <span className="text-sm text-gray-600">
                            @ ${item.price_at_order.toLocaleString('es-CO')}
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
                          Subtotal: ${subtotal.toLocaleString('es-CO')}
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
              <span className="font-bold text-2xl text-green-700">${activeOrder.total.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para imagen completa */}
      {showFullImage && (selectedPaymentImage || imageUrl) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] cursor-pointer"
          onClick={() => {
            setShowFullImage(false);
            setSelectedPaymentImage(null);
          }}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]">
            <button
              onClick={() => {
                setShowFullImage(false);
                setSelectedPaymentImage(null);
              }}
              className="absolute top-4 right-4 bg-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold hover:bg-gray-200 z-10"
            >
              ×
            </button>
            <img
              src={selectedPaymentImage || imageUrl!}
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


