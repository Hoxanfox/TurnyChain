// =================================================================
// ARCHIVO: /src/features/waiter/components/CheckoutBeforeSendModal.tsx
// Modal para cobrar ANTES de enviar la orden
// =================================================================
import React, { useState, useRef } from 'react';
import { MdClose, MdAttachMoney, MdPhoneAndroid, MdCameraAlt, MdDelete, MdImage } from 'react-icons/md';
import { compressImage, validateImageFile } from '../../../utils/imageUtils';
import type { PaymentInput } from '../../shared/orders/api/ordersAPI.ts';

interface CheckoutBeforeSendModalProps {
  orderTotal: number;
  tableNumber: number;
  onClose: () => void;
  onConfirm: (paymentMethod: 'efectivo' | 'transferencia' | 'mixto', proofFile: File | null, splitPayments?: PaymentInput[]) => Promise<boolean> | boolean;
  externalSubmitting?: boolean;
  isOnline?: boolean;
}

const CheckoutBeforeSendModal: React.FC<CheckoutBeforeSendModalProps> = ({
  orderTotal, tableNumber, onClose, onConfirm, externalSubmitting = false, isOnline = true
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'mixto'>('efectivo');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Mixto
  const [splitPayments, setSplitPayments] = useState<PaymentInput[]>([]);
  const [addingSplit, setAddingSplit] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [splitAmount, setSplitAmount] = useState<number | ''>('');
  const [splitProofImage, setSplitProofImage] = useState<File | null>(null);
  const [splitPreviewUrl, setSplitPreviewUrl] = useState<string | null>(null);

  // Referencia oculta para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const splitFileInputRef = useRef<HTMLInputElement>(null);
  const splitCameraInputRef = useRef<HTMLInputElement>(null);

  const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = orderTotal - totalPaid;

  // Formateador de moneda
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  // Clave única para localStorage basada en mesa y total (puedes mejorarla si tienes un id de orden temporal)
  const storageKey = `payment_proof_before_send_${tableNumber}_${orderTotal}`;

  // Recuperar imagen guardada cada vez que se selecciona transferencia
  React.useEffect(() => {
    if (paymentMethod === 'transferencia') {
      const savedImageData = localStorage.getItem(storageKey);
      if (savedImageData) {
        try {
          const { base64, fileName, fileType } = JSON.parse(savedImageData);
          fetch(base64)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], fileName, { type: fileType });
              setProofImage(file);
              setPreviewUrl(base64);
              console.log('[CheckoutBeforeSendModal] Imagen restaurada en estado');
            })
            .catch(err => {
              console.error('[CheckoutBeforeSendModal] Error al recuperar imagen guardada:', err);
              localStorage.removeItem(storageKey);
            });
        } catch (err) {
          console.error('[CheckoutBeforeSendModal] Error al parsear imagen guardada:', err);
          localStorage.removeItem(storageKey);
        }
      } else {
        setProofImage(null);
        setPreviewUrl(null);
        console.log('[CheckoutBeforeSendModal] No hay imagen guardada para transferencia');
      }
    }
  }, [paymentMethod, storageKey]);

  // Manejar captura de foto con validación y compresión
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar archivo
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Archivo inválido');
      return;
    }

    try {
      setIsCompressing(true);
      setError(null);

      console.log('📸 Imagen capturada:', {
        nombre: file.name,
        tamaño: `${(file.size / 1024).toFixed(2)} KB`,
        tipo: file.type
      });

      // Comprimir imagen para optimizar envío desde móviles
      const compressedFile = await compressImage(file, 1200, 0.8);

      setProofImage(compressedFile);

      // Crear URL temporal para previsualizar
      const url = URL.createObjectURL(compressedFile);
      setPreviewUrl(url);

      // Guardar en localStorage para persistencia
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const imageData = {
          base64,
          fileName: compressedFile.name,
          fileType: compressedFile.type
        };
        localStorage.setItem(storageKey, JSON.stringify(imageData));
        const previewBase64 = base64.length > 100 ? base64.substring(0, 100) + '...' : base64;
        console.log('[CheckoutBeforeSendModal] Imagen guardada en localStorage:', { ...imageData, base64: previewBase64 });
      };
      reader.readAsDataURL(compressedFile);

      console.log('✅ Imagen procesada y lista para enviar');
    } catch (err) {
      console.error('❌ Error al procesar imagen:', err);
      setError('Error al procesar la imagen. Intenta nuevamente.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Limpiar foto si quedó mal
  const handleRemovePhoto = () => {
    setProofImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Limpiar de localStorage
    localStorage.removeItem(storageKey);
    console.log('[CheckoutBeforeSendModal] Imagen eliminada manualmente');
  };

  const handleSubmit = async () => {
    if (isSubmitting || externalSubmitting) return;

    if (!isOnline) {
      setError('Sin conexion a internet. Reconecta para enviar la comanda.');
      return;
    }

    // Validaciones
    if (paymentMethod === 'transferencia' && !proofImage) {
      setError("Por favor adjunta la foto del comprobante");
      return;
    }
    if (paymentMethod === 'mixto') {
      if (remaining > 0) {
        setError('Aún queda saldo por pagar');
        return;
      }
      if (splitPayments.length === 0) {
        setError('No hay pagos agregados');
        return;
      }
    }

    setIsSubmitting(true);
    // Limpiar localStorage solo al confirmar
    localStorage.removeItem(storageKey);
    setError(null);

    try {
      // Confirmar y enviar datos de pago al padre
      const ok = await onConfirm(paymentMethod, proofImage, paymentMethod === 'mixto' ? splitPayments : undefined);
      if (!ok) {
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('[CheckoutBeforeSendModal] Error al confirmar cobro:', err);
      setError('No se pudo procesar el cobro. Intenta nuevamente.');
      setIsSubmitting(false);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (splitPreviewUrl) URL.revokeObjectURL(splitPreviewUrl);
    };
  }, [previewUrl, splitPreviewUrl]);

  // Cambiar método de pago sin borrar imagen
  const handlePaymentMethodChange = (method: 'efectivo' | 'transferencia' | 'mixto') => {
    setPaymentMethod(method);
    // No borrar imagen ni limpiar localStorage
  };

  // Funciones para Mixto
  const handleAddSplitPayment = () => {
    if (!splitAmount || Number(splitAmount) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    const amt = Number(splitAmount);
    if (amt > remaining) {
      setError('El monto no puede ser mayor al saldo restante');
      return;
    }
    if (splitMethod === 'transferencia' && !splitProofImage) {
      setError('Adjunta la foto del comprobante de transferencia');
      return;
    }

    setSplitPayments([...splitPayments, { method: splitMethod, amount: amt, file: splitProofImage }]);
    setAddingSplit(false);
    setSplitAmount('');
    setSplitProofImage(null);
    setSplitPreviewUrl(null);
    setError(null);
  };

  const handleSplitFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const compressedFile = await compressImage(file, 1200, 0.8);
      setSplitProofImage(compressedFile);
      setSplitPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (err) {
      setError('Error al procesar la imagen.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveSplitPhoto = () => {
    setSplitProofImage(null);
    if (splitPreviewUrl) URL.revokeObjectURL(splitPreviewUrl);
    setSplitPreviewUrl(null);
    if (splitFileInputRef.current) splitFileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-900 to-green-800 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">💰 Cobrar Mesa {tableNumber}</h2>
            <p className="text-gray-300 text-sm">Antes de enviar la comanda</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting || externalSubmitting}
            className="p-2 bg-green-800 rounded-full hover:bg-green-700 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* TOTAL EN GRANDE */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center border-b border-gray-200">
          <span className="text-4xl font-black text-gray-800 tracking-tight">
            {formatMoney(orderTotal)}
          </span>
        </div>

        {/* SELECCIÓN DE MÉTODO (TABS) */}
        {!addingSplit && (
          <div className="flex p-3 gap-2 bg-gray-100">
            <button
              onClick={() => handlePaymentMethodChange('efectivo')}
              disabled={isSubmitting || externalSubmitting}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                paymentMethod === 'efectivo' 
                  ? 'bg-white text-green-700 shadow-lg border-2 border-green-200' 
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              <MdAttachMoney size={20} /> Efectivo
            </button>
            <button
              onClick={() => handlePaymentMethodChange('transferencia')}
              disabled={isSubmitting || externalSubmitting}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                paymentMethod === 'transferencia' 
                  ? 'bg-white text-blue-700 shadow-lg border-2 border-blue-200' 
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              <MdPhoneAndroid size={20} /> Transf.
            </button>
            <button
              onClick={() => handlePaymentMethodChange('mixto')}
              disabled={isSubmitting || externalSubmitting}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                paymentMethod === 'mixto' 
                  ? 'bg-white text-purple-700 shadow-lg border-2 border-purple-200' 
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              <MdAttachMoney size={20} /> Mixto
            </button>
          </div>
        )}

        {/* BODY DINÁMICO */}
        <div className="p-6 overflow-y-auto flex-grow">

          {/* --- CASO 1: EFECTIVO --- */}
          {paymentMethod === 'efectivo' && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 p-4 rounded-xl border-2 border-green-100 text-green-800">
                <p className="font-semibold text-lg mb-1">✅ Recibe el dinero en efectivo</p>
                <p className="text-sm opacity-80">Confirma una vez hayas recibido el pago del cliente.</p>
              </div>
              <div className="text-7xl animate-bounce">💵</div>
              <p className="text-gray-600 text-sm italic">El cambio se calcula manualmente</p>
            </div>
          )}

          {/* --- CASO 2: TRANSFERENCIA (CÁMARA) --- */}
          {paymentMethod === 'transferencia' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-100 text-blue-800 text-sm">
                <p className="font-semibold mb-1">📱 Instrucciones:</p>
                <p>Pide al cliente que transfiera el monto exacto y <strong>toma una foto clara del comprobante</strong> antes de confirmar.</p>
              </div>

              {/* INPUT CÁMARA OCULTO */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleFileChange}
              />
              {/* INPUT ARCHIVO OCULTO */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {!previewUrl ? (
                // BOTONES DE CÁMARA Y ARCHIVO
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isCompressing || isSubmitting || externalSubmitting}
                    className={`flex-1 h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                      isCompressing
                        ? 'border-blue-400 bg-blue-50 cursor-wait'
                        : 'border-gray-300 text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 active:scale-95'
                    }`}
                  >
                    {isCompressing ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                    ) : (
                      <>
                        <MdCameraAlt size={36} />
                        <span className="font-bold text-sm block">Tomar Foto</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing || isSubmitting || externalSubmitting}
                    className={`flex-1 h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                      isCompressing
                        ? 'border-blue-400 bg-blue-50 cursor-wait'
                        : 'border-gray-300 text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 active:scale-95'
                    }`}
                  >
                    {isCompressing ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                    ) : (
                      <>
                        <MdImage size={36} />
                        <span className="font-bold text-sm block text-center">Adjuntar<br/>Archivo</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                // PREVISUALIZACIÓN DE FOTO
                <div className="relative rounded-2xl overflow-hidden border-2 border-green-300 shadow-lg">
                  <img src={previewUrl} alt="Comprobante" className="w-full h-56 object-cover" />

                  {/* Botón para borrar y reintentar */}
                  <button
                    onClick={handleRemovePhoto}
                    disabled={isSubmitting || externalSubmitting}
                    className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-all active:scale-90"
                  >
                    <MdDelete size={20} />
                  </button>

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-sm p-3">
                    <p className="font-semibold">✅ Comprobante adjuntado</p>
                    <p className="text-xs opacity-90">Revisa que la imagen sea legible</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- CASO 3: MIXTO --- */}
          {paymentMethod === 'mixto' && (
            <div className="space-y-4">
              {!addingSplit ? (
                <>
                  <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-100 text-purple-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Pagado:</span>
                      <span className="font-bold text-green-600">{formatMoney(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Restante:</span>
                      <span className={`font-bold ${remaining === 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatMoney(remaining)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {splitPayments.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            p.method === 'transferencia' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {p.method}
                          </span>
                          {p.file && <span className="text-xs text-gray-500">📸 Con foto</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatMoney(p.amount)}</span>
                          <button
                            onClick={() => {
                              const newPayments = [...splitPayments];
                              newPayments.splice(idx, 1);
                              setSplitPayments(newPayments);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <MdDelete size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {remaining > 0 && (
                    <button
                      onClick={() => {
                        setAddingSplit(true);
                        setSplitMethod('efectivo');
                        setSplitAmount(remaining);
                        setSplitProofImage(null);
                        setSplitPreviewUrl(null);
                        setError(null);
                      }}
                      className="w-full py-3 border-2 border-dashed border-purple-300 text-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
                    >
                      <span>➕</span> Agregar Pago Parcial
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setSplitMethod('efectivo')}
                      className={`flex-1 py-2 rounded-lg font-bold border-2 ${
                        splitMethod === 'efectivo' ? 'bg-green-50 text-green-700 border-green-300' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Efectivo
                    </button>
                    <button
                      onClick={() => setSplitMethod('transferencia')}
                      className={`flex-1 py-2 rounded-lg font-bold border-2 ${
                        splitMethod === 'transferencia' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Transferencia
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Monto a pagar</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        value={splitAmount}
                        onChange={(e) => setSplitAmount(e.target.value ? Number(e.target.value) : '')}
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 text-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {splitMethod === 'transferencia' && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={splitCameraInputRef}
                        onChange={handleSplitFileChange}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={splitFileInputRef}
                        onChange={handleSplitFileChange}
                      />
                      {!splitPreviewUrl ? (
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => splitCameraInputRef.current?.click()}
                            disabled={isCompressing}
                            className="flex-1 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          >
                            {isCompressing ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent"></div>
                            ) : (
                              <>
                                <MdCameraAlt size={24} />
                                <span className="text-xs font-bold">Tomar Foto</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => splitFileInputRef.current?.click()}
                            disabled={isCompressing}
                            className="flex-1 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          >
                            {isCompressing ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent"></div>
                            ) : (
                              <>
                                <MdImage size={24} />
                                <span className="text-xs font-bold text-center">Adjuntar<br/>Archivo</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border-2 border-green-300">
                          <img src={splitPreviewUrl} alt="Comprobante parcial" className="w-full h-32 object-cover" />
                          <button
                            onClick={handleRemoveSplitPhoto}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setAddingSplit(false)}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddSplitPayment}
                      className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
            <p className="text-sm text-red-700 font-semibold">⚠️ {error}</p>
          </div>
        )}

        {!isOnline && (
          <div className="mx-6 mb-4 p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
            <p className="text-sm text-amber-700 font-semibold">📡 Sin conexion a internet. El envio esta bloqueado temporalmente.</p>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {!addingSplit && (
            <>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || externalSubmitting || !isOnline || (paymentMethod === 'transferencia' && !proofImage) || (paymentMethod === 'mixto' && remaining > 0)}
                className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                  isSubmitting || externalSubmitting || !isOnline || (paymentMethod === 'transferencia' && !proofImage) || (paymentMethod === 'mixto' && remaining > 0)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : paymentMethod === 'efectivo'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white active:scale-95 shadow-green-300'
                      : paymentMethod === 'mixto'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white active:scale-95 shadow-purple-300'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white active:scale-95 shadow-blue-300'
                }`}
              >
                {(isSubmitting || externalSubmitting)
                  ? '⏳ ENVIANDO...'
                  : paymentMethod === 'efectivo'
                    ? '✅ CONFIRMAR Y ENVIAR COMANDA'
                    : paymentMethod === 'mixto'
                    ? '🔀 CONFIRMAR PAGO MIXTO Y ENVIAR'
                    : '📤 ADJUNTAR Y ENVIAR COMANDA'}
              </button>

              {paymentMethod === 'transferencia' && !proofImage && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  * Es obligatorio adjuntar el comprobante para transferencias
                </p>
              )}
              {paymentMethod === 'mixto' && remaining > 0 && (
                <p className="text-xs text-red-500 text-center mt-2 font-bold">
                  * Debes completar el saldo total para poder enviar la comanda
                </p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default CheckoutBeforeSendModal;

