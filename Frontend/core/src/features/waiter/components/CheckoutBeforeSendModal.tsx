// =================================================================
// ARCHIVO: /src/features/waiter/components/CheckoutBeforeSendModal.tsx
// Modal para cobrar ANTES de enviar la orden
// =================================================================
import React, { useState, useRef } from 'react';
import { MdClose, MdAttachMoney, MdPhoneAndroid, MdCameraAlt, MdDelete } from 'react-icons/md';
import { compressImage, validateImageFile } from '../../../utils/imageUtils';

interface CheckoutBeforeSendModalProps {
  orderTotal: number;
  tableNumber: number;
  onClose: () => void;
  onConfirm: (paymentMethod: 'efectivo' | 'transferencia', proofFile: File | null) => void;
}

const CheckoutBeforeSendModal: React.FC<CheckoutBeforeSendModalProps> = ({
  orderTotal, tableNumber, onClose, onConfirm
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Referencia oculta para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formateador de moneda
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

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
  };

  const handleSubmit = () => {
    // Validaciones
    if (paymentMethod === 'transferencia' && !proofImage) {
      setError("Por favor adjunta la foto del comprobante");
      return;
    }

    // Confirmar y enviar datos de pago al padre
    onConfirm(paymentMethod, proofImage);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
        <div className="flex p-3 gap-2 bg-gray-100">
          <button
            onClick={() => {
              setPaymentMethod('efectivo');
              handleRemovePhoto();
            }}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              paymentMethod === 'efectivo' 
                ? 'bg-white text-green-700 shadow-lg border-2 border-green-200' 
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <MdAttachMoney size={24} /> Efectivo
          </button>
          <button
            onClick={() => setPaymentMethod('transferencia')}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              paymentMethod === 'transferencia' 
                ? 'bg-white text-blue-700 shadow-lg border-2 border-blue-200' 
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            <MdPhoneAndroid size={24} /> Transferencia
          </button>
        </div>

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

              {/* INPUT CÁMARA OCULTO + BOTÓN PERSONALIZADO */}
              <input
                type="file"
                accept="image/*"
                capture="environment" // Fuerza cámara trasera
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {!previewUrl ? (
                // BOTÓN DE CÁMARA GRANDE
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className={`w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
                    isCompressing
                      ? 'border-blue-400 bg-blue-50 cursor-wait'
                      : 'border-gray-300 text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 active:scale-95'
                  }`}
                >
                  {isCompressing ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                      <div className="text-center">
                        <span className="font-bold text-lg block text-blue-600">Procesando imagen...</span>
                        <span className="text-xs text-blue-500">Optimizando para envío</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <MdCameraAlt size={56} />
                      <div className="text-center">
                        <span className="font-bold text-lg block">📸 Tomar Foto del Comprobante</span>
                        <span className="text-xs text-gray-400">Toca aquí para abrir la cámara</span>
                      </div>
                    </>
                  )}
                </button>
              ) : (
                // PREVISUALIZACIÓN DE FOTO
                <div className="relative rounded-2xl overflow-hidden border-2 border-green-300 shadow-lg">
                  <img src={previewUrl} alt="Comprobante" className="w-full h-56 object-cover" />

                  {/* Botón para borrar y reintentar */}
                  <button
                    onClick={handleRemovePhoto}
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
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
            <p className="text-sm text-red-700 font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* FOOTER DE ACCIÓN */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={paymentMethod === 'transferencia' && !proofImage}
            className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
              paymentMethod === 'transferencia' && !proofImage
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : paymentMethod === 'efectivo'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white active:scale-95 shadow-green-300'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white active:scale-95 shadow-blue-300'
            }`}
          >
            {paymentMethod === 'efectivo' ? '✅ CONFIRMAR Y ENVIAR COMANDA' : '📤 ADJUNTAR Y ENVIAR COMANDA'}
          </button>

          {paymentMethod === 'transferencia' && !proofImage && (
            <p className="text-xs text-gray-500 text-center mt-2">
              * Es obligatorio adjuntar el comprobante para transferencias
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default CheckoutBeforeSendModal;

