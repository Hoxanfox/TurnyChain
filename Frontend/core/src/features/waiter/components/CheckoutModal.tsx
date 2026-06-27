import React, { useState, useRef } from 'react';
import { MdClose, MdAttachMoney, MdPhoneAndroid, MdCameraAlt, MdDelete, MdAdd, MdImage } from 'react-icons/md';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import { uploadSplitPayments, updateOrderStatus } from '../../shared/orders/api/ordersAPI.ts';
import type { PaymentInput } from '../../shared/orders/api/ordersAPI.ts';
import { compressImage, validateImageFile } from '../../../utils/imageUtils';

interface CheckoutModalProps {
  orderId: string;
  groupOrderInfos?: { id: string, total: number }[];
  orderTotal: number;
  tableNumber: number;
  forcePaidAfterCheckout?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentState = 'summary' | 'adding_payment';

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  orderId, groupOrderInfos, orderTotal, tableNumber, forcePaidAfterCheckout = false, onClose, onSuccess
}) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const targetOrderIds = groupOrderInfos && groupOrderInfos.length > 0 ? groupOrderInfos.map(info => info.id) : [orderId];
  const isGlobalCheckout = groupOrderInfos && groupOrderInfos.length > 1;

  // Estados
  const [payments, setPayments] = useState<PaymentInput[]>([]);
  const [paymentState, setPaymentState] = useState<PaymentState>('summary');
  const [currentMethod, setCurrentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [currentAmount, setCurrentAmount] = useState<number | ''>('');
  const [currentProofImage, setCurrentProofImage] = useState<File | null>(null);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | null>(null);

  const [matchingTransfers, setMatchingTransfers] = useState<any[]>([]);
  const [isSearchingTransfers, setIsSearchingTransfers] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = orderTotal - totalPaid;

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  const handleStartAddingPayment = (method: 'efectivo' | 'transferencia') => {
    setPaymentState('adding_payment');
    setCurrentMethod(method);
    setCurrentAmount(remaining > 0 ? remaining : '');
    setCurrentProofImage(null);
    setCurrentPreviewUrl(null);
    setError(null);
    
    if (method === 'transferencia' && localStorage.getItem('user_role') === 'cajero') {
      searchMatchingTransfers(remaining > 0 ? remaining : 0);
    }
  };

  const searchMatchingTransfers = async (amountToMatch: number) => {
    if (!token || amountToMatch <= 0) return;
    try {
      setIsSearchingTransfers(true);
      const res = await fetch('http://localhost:8080/api/bank-transfers/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const unusedMatch = (data || []).filter((t: any) => !t.is_used && t.amount === amountToMatch);
        setMatchingTransfers(unusedMatch);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingTransfers(false);
    }
  };

  const handleCancelAdding = () => {
    setPaymentState('summary');
    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Archivo inválido');
      return;
    }

    try {
      setIsCompressing(true);
      setError(null);

      console.log('📸 Imagen capturada (modal cajero):', {
        nombre: file.name,
        tamaño: `${(file.size / 1024).toFixed(2)} KB`,
        tipo: file.type
      });

      const compressedFile = await compressImage(file, 1200, 0.8);
      setCurrentProofImage(compressedFile);

      const url = URL.createObjectURL(compressedFile);
      setCurrentPreviewUrl(url);
      setError(null);
      console.log('✅ Imagen procesada y lista');
    } catch (err) {
      console.error('❌ Error al procesar imagen:', err);
      setError('Error al procesar la imagen. Intenta nuevamente.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    setCurrentProofImage(null);
    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    setCurrentPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddPaymentToArray = () => {
    if (!currentAmount || Number(currentAmount) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    const amt = Number(currentAmount);
    if (amt > remaining) {
      setError('El monto no puede ser mayor al saldo restante');
      return;
    }
    if (currentMethod === 'transferencia' && !currentProofImage) {
      setError('Adjunta la foto del comprobante de transferencia');
      return;
    }

    setPayments([...payments, { method: currentMethod, amount: amt, file: currentProofImage }]);
    setPaymentState('summary');
  };

  const handleRemovePaymentFromArray = (index: number) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
  };

  const handleSubmitAll = async () => {
    if (remaining > 0) {
      setError('Aún queda saldo por pagar');
      return;
    }
    if (payments.length === 0) {
      setError('No hay pagos agregados');
      return;
    }
    if (!token) {
      setError('Sesión expirada. Por favor inicie sesión nuevamente.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (groupOrderInfos && groupOrderInfos.length > 0) {
        let paymentPool = payments.map(p => ({ ...p, remaining: p.amount }));

        for (const orderInfo of groupOrderInfos) {
          let needed = orderInfo.total;
          let orderPayments: PaymentInput[] = [];

          for (let p of paymentPool) {
            if (needed <= 0) break;
            if (p.remaining <= 0) continue;

            let take = Math.min(needed, p.remaining);
            p.remaining -= take;
            needed -= take;

            orderPayments.push({
              method: p.method,
              amount: take,
              file: p.file
            });
          }

            if (orderPayments.length > 0) {
              await uploadSplitPayments(orderInfo.id, orderPayments, token);
              if (forcePaidAfterCheckout) {
                await updateOrderStatus(orderInfo.id, 'pagado', token);
              }
            }
          }
        } else {
          await uploadSplitPayments(orderId, payments, token);
          if (forcePaidAfterCheckout) {
            await updateOrderStatus(orderId, 'pagado', token);
          }
        }
        onSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error al procesar el pago. Intente nuevamente.'
      );
      console.error('Upload error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    };
  }, [currentPreviewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">💳 Cobrar Mesa {tableNumber}</h2>
            <p className="text-gray-400 text-sm">
              {isGlobalCheckout ? `Pago global para ${targetOrderIds.length} comandas` : 'Pagos de la orden'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            <MdClose size={24} />
          </button>
        </div>

        {paymentState === 'summary' ? (
          /* VISTA PRINCIPAL: RESUMEN Y LISTA DE PAGOS */
          <div className="flex flex-col flex-grow overflow-hidden">
            {/* SALDOS */}
            <div className="bg-gray-50 p-6 text-center border-b border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 font-semibold">Total:</span>
                <span className="text-xl font-bold text-gray-800">{formatMoney(orderTotal)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 font-semibold">Pagado:</span>
                <span className="text-xl font-bold text-green-600">{formatMoney(totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-600 font-black text-lg">Restante:</span>
                <span className={`text-2xl font-black ${remaining === 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatMoney(remaining)}
                </span>
              </div>
            </div>

            {/* LISTA DE PAGOS */}
            <div className="p-4 overflow-y-auto flex-grow bg-white">
              <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Pagos Añadidos</h3>
              {payments.length === 0 ? (
                <div className="text-center p-4 bg-gray-50 rounded-lg text-gray-400 border border-dashed border-gray-300">
                  Aún no hay pagos añadidos.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
                      <div className="flex items-center gap-3">
                        {p.method === 'efectivo' ? (
                          <div className="bg-green-100 p-2 rounded-full text-green-700"><MdAttachMoney size={20}/></div>
                        ) : (
                          <div className="bg-blue-100 p-2 rounded-full text-blue-700"><MdPhoneAndroid size={20}/></div>
                        )}
                        <div>
                          <p className="font-bold text-gray-800 capitalize">{p.method}</p>
                          {p.method === 'transferencia' && p.file && (
                            <p className="text-xs text-gray-500">📷 Comprobante adjunto</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-700">{formatMoney(p.amount)}</span>
                        <button
                          onClick={() => handleRemovePaymentFromArray(index)}
                          className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm"
                        >
                          <MdDelete size={20}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* BOTONES PARA AÑADIR PAGOS */}
              {remaining > 0 && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleStartAddingPayment('efectivo')}
                    className="flex-1 py-3 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 hover:bg-green-100 transition-colors flex justify-center items-center gap-1"
                  >
                    <MdAdd /> Efectivo
                  </button>
                  <button
                    onClick={() => handleStartAddingPayment('transferencia')}
                    className="flex-1 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors flex justify-center items-center gap-1"
                  >
                    <MdAdd /> Transf.
                  </button>
                </div>
              )}
            </div>

            {/* ERROR SUMMARY */}
            {error && (
              <div className="mx-6 my-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                <p className="text-sm text-red-700 font-semibold">⚠️ {error}</p>
              </div>
            )}

            {/* FOOTER CONFIRMAR TODO */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleSubmitAll}
                disabled={isSubmitting || remaining > 0}
                className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                  isSubmitting || remaining > 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white shadow-indigo-300'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>PROCESANDO...</span>
                  </>
                ) : (
                  <>✅ CONFIRMAR Y CERRAR CUENTA</>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* VISTA SECUNDARIA: FORMULARIO AÑADIR PAGO */
          <div className="flex flex-col flex-grow overflow-y-auto">
            <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center gap-3">
              <button onClick={handleCancelAdding} className="text-gray-500 hover:text-gray-800">
                <MdClose size={24} />
              </button>
              <h3 className="font-bold text-gray-700 capitalize">Añadir Pago: {currentMethod}</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Monto a pagar</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setCurrentAmount(val);
                      if (currentMethod === 'transferencia' && typeof val === 'number') {
                        searchMatchingTransfers(val);
                      }
                    }}
                    max={remaining}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="mt-2 text-right">
                  <button 
                    onClick={() => setCurrentAmount(remaining)}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"
                  >
                    Pagar Restante ({formatMoney(remaining)})
                  </button>
                </div>
              </div>

              {currentMethod === 'transferencia' && (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Transferencias Nequi/BREB Encontradas</label>
                    {isSearchingTransfers ? (
                      <p className="text-xs text-gray-500">Buscando transferencias por {formatMoney(Number(currentAmount))}...</p>
                    ) : matchingTransfers.length > 0 ? (
                      <div className="space-y-2">
                        {matchingTransfers.map((t) => (
                          <div 
                            key={t.id} 
                            className="p-3 rounded-lg border bg-indigo-50 border-indigo-200 shadow-sm"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-indigo-700">¡Llegó pago de {formatMoney(t.amount)}!</span>
                              <span className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-gray-700">De: {t.sender}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">No se detectaron pagos recientes por este monto exacto.</p>
                    )}
                  </div>

                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Comprobante (Obligatorio)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  {!currentPreviewUrl ? (
                    <div className="flex gap-2 w-full mt-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isCompressing || isSubmitting}
                        className={`flex-1 h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                          isCompressing
                            ? 'border-blue-400 bg-blue-50 cursor-wait text-blue-600'
                            : 'border-gray-300 text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 active:scale-95'
                        }`}
                      >
                        {isCompressing ? (
                          <div className="animate-spin rounded-full h-7 w-7 border-4 border-blue-600 border-t-transparent"></div>
                        ) : (
                          <>
                            <MdCameraAlt size={32} />
                            <div className="text-center">
                              <span className="font-bold text-sm block">Tomar Foto</span>
                            </div>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressing || isSubmitting}
                        className={`flex-1 h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                          isCompressing
                            ? 'border-blue-400 bg-blue-50 cursor-wait text-blue-600'
                            : 'border-gray-300 text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 active:scale-95'
                        }`}
                      >
                        {isCompressing ? (
                          <div className="animate-spin rounded-full h-7 w-7 border-4 border-blue-600 border-t-transparent"></div>
                        ) : (
                          <>
                            <MdImage size={32} />
                            <div className="text-center">
                              <span className="font-bold text-sm block">Adjuntar Archivo</span>
                            </div>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-green-300 shadow-md">
                      <img src={currentPreviewUrl} alt="Comprobante" className="w-full h-40 object-cover" />
                      <button
                        onClick={handleRemovePhoto}
                        disabled={isSubmitting}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition-all active:scale-90"
                      >
                        <MdDelete size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 font-semibold text-center">{error}</p>
                </div>
              )}

              <button
                onClick={handleAddPaymentToArray}
                disabled={isCompressing || isSubmitting}
                className={`w-full mt-4 py-3 font-bold rounded-xl shadow transition-colors ${
                  isCompressing || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isCompressing ? 'Procesando imagen...' : 'Añadir a la cuenta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
