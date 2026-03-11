// =================================================================
// ARCHIVO: /src/features/waiter/components/CheckoutModal.tsx
// =================================================================
import React, { useState, useRef } from 'react';
import { MdClose, MdAttachMoney, MdPhoneAndroid, MdCameraAlt, MdDelete } from 'react-icons/md';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import { uploadPaymentProof } from '../../shared/orders/api/ordersAPI.ts';

interface CheckoutModalProps {
  orderId: string;
  orderTotal: number;
  tableNumber: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  orderId, orderTotal, tableNumber, onClose, onSuccess
}) => {
  const token = useSelector((state: RootState) => state.auth.token);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referencia oculta para el input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clave única para localStorage basada en el orderId
  const storageKey = `payment_proof_${orderId}`;

  // Cargar imagen desde localStorage al montar el componente
  React.useEffect(() => {
    const savedImageData = localStorage.getItem(storageKey);
    if (savedImageData) {
      console.log('[CheckoutModal] Imagen encontrada en localStorage:', savedImageData);
      try {
        const { base64, fileName, fileType } = JSON.parse(savedImageData);
        // Convertir base64 de vuelta a File
        fetch(base64)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], fileName, { type: fileType });
            setProofImage(file);
            setPreviewUrl(base64);
            console.log('[CheckoutModal] Imagen restaurada en estado');
          })
          .catch(err => {
            console.error('[CheckoutModal] Error al recuperar imagen guardada:', err);
            localStorage.removeItem(storageKey);
          });
      } catch (err) {
        console.error('[CheckoutModal] Error al parsear imagen guardada:', err);
        localStorage.removeItem(storageKey);
      }
    } else {
      console.log('[CheckoutModal] No hay imagen guardada en localStorage');
    }
  }, [orderId, storageKey]);

  // Recuperar imagen guardada cada vez que se selecciona transferencia
  React.useEffect(() => {
    if (paymentMethod === 'transferencia') {
      const savedImageData = localStorage.getItem(storageKey);
      console.log('[CheckoutModal] Intentando recuperar imagen de localStorage:', savedImageData);
      console.log('[CheckoutModal] Estado completo de localStorage:', {...localStorage});
      if (savedImageData) {
        try {
          const { base64, fileName, fileType } = JSON.parse(savedImageData);
          fetch(base64)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], fileName, { type: fileType });
              setProofImage(file);
              setPreviewUrl(base64);
              console.log('[CheckoutModal] Imagen restaurada en estado');
            })
            .catch(err => {
              console.error('[CheckoutModal] Error al recuperar imagen guardada:', err);
              localStorage.removeItem(storageKey);
            });
        } catch (err) {
          console.error('[CheckoutModal] Error al parsear imagen guardada:', err);
          localStorage.removeItem(storageKey);
        }
      } else {
        setProofImage(null);
        setPreviewUrl(null);
        console.log('[CheckoutModal] No hay imagen guardada para transferencia');
      }
    }
  }, [paymentMethod, storageKey]);

  // Formateador de moneda
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  // Manejar captura de foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor seleccione un archivo de imagen válido');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        setError('El archivo es muy grande. Máximo 5MB');
        return;
      }
      setProofImage(file);
      // Crear URL temporal para previsualizar
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const imageData = {
          base64,
          fileName: file.name,
          fileType: file.type
        };
        console.log('[CheckoutModal] Guardando imagen en localStorage:', { storageKey, imageData });
        localStorage.setItem(storageKey, JSON.stringify(imageData));
        console.log('[CheckoutModal] Imagen guardada en localStorage:', localStorage.getItem(storageKey));
        console.log('[CheckoutModal] Estado completo de localStorage:', {...localStorage});
      };
      reader.readAsDataURL(file);
    }
  };

  // Log al limpiar imagen
  const handleRemovePhoto = () => {
    setProofImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Limpiar de localStorage
    localStorage.removeItem(storageKey);
    console.log('[CheckoutModal] Imagen eliminada manualmente');
    console.log('[CheckoutModal] Estado completo de localStorage tras eliminar:', {...localStorage});
  };

  const handleSubmit = async () => {
    // Validaciones
    if (paymentMethod === 'transferencia' && !proofImage) {
      setError("Por favor adjunta la foto del comprobante");
      return;
    }

    if (!token) {
      setError('Sesión expirada. Por favor inicie sesión nuevamente.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Si es efectivo, crear un archivo vacío para el backend
      const fileToUpload = proofImage || new File([''], 'efectivo.txt', { type: 'text/plain' });

      await uploadPaymentProof(orderId, fileToUpload, paymentMethod, token);
      
      // ✅ SOLO LIMPIAR LOCALSTORAGE DESPUÉS DEL ÉXITO
      localStorage.removeItem(storageKey);
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar el pago. Intente nuevamente.');
      console.error('Upload error:', err);
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">💳 Cobrar Mesa {tableNumber}</h2>
            <p className="text-gray-400 text-sm">Total a recibir</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* TOTAL EN GRANDE */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center border-b border-gray-200">
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
                disabled={isSubmitting}
              />

              {!previewUrl ? (
                // BOTÓN DE CÁMARA GRANDE
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95"
                >
                  <MdCameraAlt size={56} />
                  <div className="text-center">
                    <span className="font-bold text-lg block">📸 Tomar Foto del Comprobante</span>
                    <span className="text-xs text-gray-400">Toca aquí para abrir la cámara</span>
                  </div>
                </button>
              ) : (
                // PREVISUALIZACIÓN DE FOTO
                <div className="relative rounded-2xl overflow-hidden border-2 border-green-300 shadow-lg">
                  <img src={previewUrl} alt="Comprobante" className="w-full h-56 object-cover" />

                  {/* Botón para borrar y reintentar */}
                  <button
                    onClick={handleRemovePhoto}
                    disabled={isSubmitting}
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
            disabled={isSubmitting || (paymentMethod === 'transferencia' && !proofImage)}
            className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
              isSubmitting || (paymentMethod === 'transferencia' && !proofImage)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : paymentMethod === 'efectivo'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white active:scale-95 shadow-green-300'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white active:scale-95 shadow-blue-300'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                <span>PROCESANDO...</span>
              </>
            ) : (
              <>
                {paymentMethod === 'efectivo' ? '✅ CONFIRMAR PAGO EN EFECTIVO' : '📤 ENVIAR COMPROBANTE'}
              </>
            )}
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

export default CheckoutModal;

