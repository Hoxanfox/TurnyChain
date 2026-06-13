// =================================================================
// ARCHIVO 1: /src/features/shared/OrderDetailModal.tsx (ACTUALIZADO)
// =================================================================
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchActiveOrders, fetchOrderDetails } from '../api/ordersSlice.ts';
import type { AppDispatch, RootState } from '../../../../app/store.ts';
import type { OrderItem, Order } from '../../../../types/orders.ts';
import { getPaymentProofUrl } from '../../../../utils/imageUtils.ts';

// ============================================================
// Componente para mostrar información de pago y comprobante
// ============================================================
interface PaymentInfoSectionProps {
  order: Order;
}

const PaymentInfoSection: React.FC<PaymentInfoSectionProps> = ({ order }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!order.payment_method && (!order.payments || order.payments.length === 0)) {
    return null;
  }

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  const hasMultiplePayments = order.payments && order.payments.length > 0;

  return (
    <>
      <div className="mb-6 rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        {/* HEADER */}
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <span className="text-xl">💳</span>
            </div>
            <h3 className="font-bold tracking-wide text-lg">Información de Pago</h3>
          </div>
          {order.payment_method && (
            <div className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-full border border-slate-600">
              <span className="text-sm font-semibold text-slate-200">Total pagado:</span>
              <span className="text-sm font-bold text-emerald-400">
                {formatMoney(hasMultiplePayments ? order.payments!.reduce((sum, p) => sum + p.amount, 0) : order.total)}
              </span>
            </div>
          )}
        </div>
        
        {/* BODY */}
        <div className="p-5 bg-slate-50">
          {hasMultiplePayments ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Desglose de Transacciones ({order.payments!.length})
                </span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <div className="grid gap-3">
                {order.payments!.map((payment, index) => {
                  const imgUrl = payment.payment_proof_path ? getPaymentProofUrl(payment.payment_proof_path) : null;
                  const isTransfer = payment.method === 'transferencia';

                  return (
                    <div 
                      key={payment.id || index} 
                      className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:shadow-md hover:border-indigo-300"
                    >
                      <div className="flex items-center gap-4">
                        {/* Icono del método */}
                        <div className={`p-3 rounded-full flex-shrink-0 ${
                          isTransfer ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <span className="text-xl">{isTransfer ? '📱' : '💵'}</span>
                        </div>
                        
                        <div>
                          <p className={`font-bold text-base capitalize ${
                            isTransfer ? 'text-indigo-900' : 'text-emerald-900'
                          }`}>
                            {payment.method}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {new Date(payment.created_at || order.created_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                        {imgUrl ? (
                          <button
                            onClick={() => setSelectedImage(imgUrl)}
                            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>📸</span> Ver comprobante
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Sin adjunto</span>
                        )}
                        <span className="font-black text-slate-800 text-lg tabular-nums">
                          {formatMoney(payment.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* FORMATO LEGACY (1 solo pago en la orden sin desglose array) */
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium text-sm">Método principal:</span>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${
                    order.payment_method === 'transferencia' ? 'bg-indigo-100 text-indigo-800' : 
                    order.payment_method === 'mixto' ? 'bg-purple-100 text-purple-800' : 
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {order.payment_method === 'transferencia' ? '📱 Transferencia' : 
                     order.payment_method === 'mixto' ? '🔀 Mixto' : '💵 Efectivo'}
                  </span>
                </div>
                <span className="font-black text-slate-800 text-xl">{formatMoney(order.total)}</span>
              </div>

              {order.payment_proof_path && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span>📸</span> Comprobantes adjuntos
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {order.payment_proof_path.split(',').map((path, idx) => {
                      const imgUrl = getPaymentProofUrl(path.trim());
                      return (
                        <div key={idx} className="relative group">
                          <img
                            src={imgUrl}
                            alt={`Comprobante ${idx + 1}`}
                            className="w-28 h-28 object-cover rounded-lg border border-slate-300 group-hover:border-indigo-400 group-hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setSelectedImage(imgUrl)}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors rounded-lg pointer-events-none"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
    </>
  );
};

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  editable?: boolean; // Nueva prop para controlar si se puede editar
}

const getStatusVisual = (status: string) => {
  switch (status) {
    case 'pagado':
      return { icon: '✅', label: 'Pagado', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'por_verificar':
      return { icon: '⏳', label: 'Por Verificar', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'entregado':
      return { icon: '💳', label: 'Por Cobrar', className: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'pendiente_aprobacion':
      return { icon: '🧾', label: 'Pendiente Aprobacion', className: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    case 'aprobado':
      return { icon: '👌', label: 'Aprobado', className: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
    case 'rechazado':
      return { icon: '❌', label: 'Rechazado', className: 'bg-rose-100 text-rose-800 border-rose-300' };
    case 'cancelado':
      return { icon: '⛔', label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-300' };
    default:
      return { icon: 'ℹ️', label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };
  }
};

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ orderId, onClose, editable = false }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedOrderDetails, detailsStatus, activeOrders } = useSelector((state: RootState) => state.orders);
  const [currentOrderId, setCurrentOrderId] = useState(orderId);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [editedNotes, setEditedNotes] = useState<string>('');

  useEffect(() => {
    setCurrentOrderId(orderId);
  }, [orderId]);

  useEffect(() => {
    if (currentOrderId) {
      dispatch(fetchOrderDetails(currentOrderId));
    }
  }, [currentOrderId, dispatch]);

  useEffect(() => {
    dispatch(fetchActiveOrders({ teamOrders: true }));
  }, [dispatch]);

  const groupOrders = React.useMemo(() => {
    if (!selectedOrderDetails) return [] as Order[];

    const orderMap = new Map<string, Order>();
    (activeOrders || []).forEach((order) => orderMap.set(order.id, order));

    const rootId = selectedOrderDetails.parent_order_id || selectedOrderDetails.id;
    const parentOrder = orderMap.get(rootId) || selectedOrderDetails;

    const children = (activeOrders || [])
      .filter((order) => order.parent_order_id === parentOrder.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return [parentOrder, ...children];
  }, [selectedOrderDetails, activeOrders]);

  const groupTotal = React.useMemo(() => {
    return groupOrders.reduce((sum, order) => sum + order.total, 0);
  }, [groupOrders]);

  // Debug: Ver qué datos están llegando del backend
  useEffect(() => {
    if (selectedOrderDetails && (selectedOrderDetails.items?.length || 0) > 0) {
      const firstItem = selectedOrderDetails.items[0];

      console.log('🔍 DEBUG - Detalle de Orden (NUEVO FORMATO):', {
        orderId: selectedOrderDetails.id,
        totalItems: selectedOrderDetails.items?.length || 0,
        primerItem: firstItem,
        customizations: firstItem.customizations,
        active_ingredients: firstItem.customizations?.active_ingredients || [],
        selected_accompaniments: firstItem.customizations?.selected_accompaniments || [],
      });
    }
  }, [selectedOrderDetails]);

  const handleEditItem = (index: number, item: OrderItem) => {
    setEditingItemIndex(index);
    setEditedPrice(item.price_at_order);
    setEditedNotes(item.notes || '');
  };

  const handleSaveEdit = () => {
    // Aquí deberías implementar la lógica para guardar los cambios
    // Por ahora solo cerramos el modo de edición
    alert('Funcionalidad de guardar en desarrollo. Conecta con tu backend.');
    setEditingItemIndex(null);
  };

  const handleDeleteItem = (index: number) => {
    if (confirm('¿Estás seguro de eliminar este item?')) {
      // Aquí deberías implementar la lógica para eliminar el item
      console.log('Eliminando item en el índice:', index);
      alert('Funcionalidad de eliminar en desarrollo. Conecta con tu backend.');
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Detalle de la Orden</h2>
            {selectedOrderDetails && (
              <p className="text-xs text-gray-500 font-mono mt-1">
                ID: {selectedOrderDetails.id}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-2xl font-bold text-gray-600 hover:text-gray-900">&times;</button>
        </div>
        {detailsStatus === 'loading' && <p>Cargando detalles...</p>}
        {detailsStatus === 'succeeded' && selectedOrderDetails && (
          <div>
            {(() => {
              const statusVisual = getStatusVisual(selectedOrderDetails.status);
              return (
                <div className="mb-4 p-3 bg-white border rounded-lg shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Estado Actual</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${statusVisual.className}`}>
                    <span>{statusVisual.icon}</span>
                    <span>{statusVisual.label}</span>
                  </div>
                </div>
              );
            })()}

            {groupOrders.length > 1 && (
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-indigo-800">Grupo vinculado</h3>
                  <span className="text-xs font-semibold text-indigo-700">
                    {groupOrders.length} comandas
                  </span>
                </div>
                <div className="mb-2 px-3 py-2 rounded-md bg-white border border-indigo-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-700">Total global del grupo</span>
                  <span className="text-sm font-bold text-indigo-900">${groupTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="space-y-2">
                  {groupOrders.map((groupOrder, index) => {
                    const isCurrent = groupOrder.id === selectedOrderDetails.id;
                    const groupStatusVisual = getStatusVisual(groupOrder.status);
                    return (
                      <button
                        key={groupOrder.id}
                        type="button"
                        onClick={() => setCurrentOrderId(groupOrder.id)}
                        className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                          isCurrent
                            ? 'bg-indigo-100 border-indigo-400 text-indigo-900'
                            : 'bg-white border-indigo-200 hover:bg-indigo-50 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            {index === 0 ? 'Padre' : `Hija ${index}`} • Mesa {groupOrder.table_number}
                          </span>
                          <span className="text-sm font-bold">${groupOrder.total.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="text-xs mt-1 opacity-90 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-semibold ${groupStatusVisual.className}`}>
                            <span>{groupStatusVisual.icon}</span>
                            <span>{groupStatusVisual.label}</span>
                          </span>
                          <span className="text-gray-600">ID: {groupOrder.id.substring(0, 8)}...</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Información del Tipo de Orden */}
            {selectedOrderDetails.order_type && (
              <div className={`mb-4 p-4 rounded-lg border-2 ${
                selectedOrderDetails.order_type === 'mesa' 
                  ? 'bg-indigo-50 border-indigo-300'
                  : selectedOrderDetails.order_type === 'llevar'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-purple-50 border-purple-300'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {selectedOrderDetails.order_type === 'mesa' ? '🍽️' :
                     selectedOrderDetails.order_type === 'llevar' ? '🥡' : '🏍️'}
                  </span>
                  <div>
                    <p className={`font-bold text-lg ${
                      selectedOrderDetails.order_type === 'mesa' ? 'text-indigo-800' :
                      selectedOrderDetails.order_type === 'llevar' ? 'text-green-800' : 'text-purple-800'
                    }`}>
                      {selectedOrderDetails.order_type === 'mesa' ? 'Orden en Mesa' :
                       selectedOrderDetails.order_type === 'llevar' ? 'Orden Para Llevar' : 'Orden a Domicilio'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mesa {selectedOrderDetails.table_number}
                      {selectedOrderDetails.order_type === 'llevar' && ' (Virtual 9999)'}
                      {selectedOrderDetails.order_type === 'domicilio' && ' (Virtual 9998)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Datos de Domicilio */}
            {selectedOrderDetails.order_type === 'domicilio' && (
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
                      <p className="text-sm text-gray-800">{selectedOrderDetails.delivery_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 mt-0.5">📞</span>
                    <div>
                      <p className="text-xs font-semibold text-purple-700">Teléfono:</p>
                      <p className="text-sm text-gray-800">{selectedOrderDetails.delivery_phone}</p>
                    </div>
                  </div>
                  {selectedOrderDetails.delivery_notes && (
                    <div className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">💬</span>
                      <div>
                        <p className="text-xs font-semibold text-purple-700">Notas:</p>
                        <p className="text-sm text-gray-800 italic">{selectedOrderDetails.delivery_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <p><strong>Total:</strong> <span className="font-bold">${selectedOrderDetails.total.toLocaleString('es-CO')}</span></p>
              <p><strong>Mesero:</strong> {selectedOrderDetails.waiter_name || <span className="text-gray-400 text-sm">(ID: {selectedOrderDetails.waiter_id.substring(0, 8)}...)</span>}</p>
            </div>

            {/* Información de Pago */}
            {selectedOrderDetails.payment_method && (
              <PaymentInfoSection order={selectedOrderDetails} />
            )}
            <h3 className="font-bold mt-4 mb-2 border-t pt-2">Ítems:</h3>
            <ul className="space-y-3">
              {(selectedOrderDetails.items || []).map((item, index) => {
                return (
                  <li key={index} className="p-3 bg-gray-50 rounded border">
                    {editingItemIndex === index ? (
                      // Modo de edición
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-lg">{item.menu_item_name}</p>
                          <button
                            onClick={() => setEditingItemIndex(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Cantidad:</label>
                          <p className="mt-1 text-lg font-semibold">{item.quantity}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Precio unitario:</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editedPrice}
                            onChange={(e) => setEditedPrice(parseFloat(e.target.value))}
                            className="mt-1 block w-full px-3 py-2 border rounded-md"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Notas:</label>
                          <textarea
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border rounded-md"
                            rows={2}
                          />
                        </div>

                        {/* Mostrar ingredientes activos (solo lectura en edición) */}
                        {item.customizations?.active_ingredients && item.customizations.active_ingredients.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes:</label>
                            <div className="flex flex-wrap gap-2">
                              {item.customizations.active_ingredients.map(ing => (
                                <span
                                  key={ing.id}
                                  className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                                >
                                  {ing.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Acompañantes seleccionados (solo lectura en edición) */}

                        {/* Acompañantes seleccionados (solo lectura en edición) */}
                        {item.customizations?.selected_accompaniments && item.customizations.selected_accompaniments.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Acompañantes seleccionados:</label>
                            <div className="flex flex-wrap gap-2">
                              {item.customizations.selected_accompaniments.map(acc => (
                                <span
                                  key={acc.id}
                                  className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                                >
                                  {acc.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            onClick={() => setEditingItemIndex(null)}
                            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo de visualización MEJORADO
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <p className="font-semibold text-lg">{item.quantity}x {item.menu_item_name}</p>
                              <span className="text-sm text-gray-600">@ ${item.price_at_order.toLocaleString('es-CO')}</span>
                            </div>

                            {/* Indicador de Para Llevar / Comer Aquí */}
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
                              Subtotal: ${(item.quantity * item.price_at_order).toLocaleString('es-CO')}
                            </p>

                            {item.notes && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                <p className="text-sm italic text-gray-700">
                                  📝 <span className="font-medium">Nota:</span> {item.notes}
                                </p>
                              </div>
                            )}

                            {/* CUSTOMIZACIONES - NUEVO FORMATO DEL BACKEND */}
                            {(() => {
                              // El backend ahora devuelve solo lo que SÍ lleva el plato
                              const activeIngredients = item.customizations?.active_ingredients || [];
                              const selectedAccompaniments = item.customizations?.selected_accompaniments || [];
                              const hasCustomizations = activeIngredients.length > 0 || selectedAccompaniments.length > 0;

                              if (!hasCustomizations) {
                                // El plato no tiene ingredientes ni acompañantes
                                return (
                                  <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-xs text-gray-500 italic">
                                      Sin ingredientes ni acompañantes especificados
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="mt-2 space-y-2">
                                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                    📋 Personalización del Plato:
                                  </p>

                                  {/* INGREDIENTES: Mostrar solo los que SÍ lleva */}
                                  {activeIngredients.length > 0 && (
                                    <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-300 shadow-sm">
                                      <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1">
                                        🥬 Ingredientes que lleva:
                                      </p>
                                      <div className="grid grid-cols-1 gap-1">
                                        {activeIngredients.map(ing => (
                                          <div key={ing.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white">
                                            <span className="text-sm font-bold text-green-600">✓</span>
                                            <p className="text-xs font-medium text-green-700">{ing.name}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Si no hay ingredientes */}
                                  {activeIngredients.length === 0 && selectedAccompaniments.length > 0 && (
                                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                      <p className="text-xs text-gray-500 italic">Sin ingredientes</p>
                                    </div>
                                  )}

                                  {/* ACOMPAÑANTES: Mostrar solo los que SÍ lleva */}
                                  {selectedAccompaniments.length > 0 && (
                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-300 shadow-sm">
                                      <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                                        🍽️ Acompañantes seleccionados:
                                      </p>
                                      <div className="grid grid-cols-1 gap-1">
                                        {selectedAccompaniments.map(acc => (
                                          <div key={acc.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white">
                                            <span className="text-sm text-blue-600">✓</span>
                                            <p className="text-xs font-medium text-blue-700">{acc.name}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Si no hay acompañantes */}
                                  {selectedAccompaniments.length === 0 && activeIngredients.length > 0 && (
                                    <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                      <p className="text-xs text-gray-500 italic">Sin acompañantes seleccionados</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          {editable && (
                            <div className="flex space-x-2 ml-2">
                              <button
                                onClick={() => handleEditItem(index, item)}
                                className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteItem(index)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailModal;