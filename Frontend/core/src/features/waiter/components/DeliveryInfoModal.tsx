// =================================================================
// ARCHIVO: /src/features/waiter/components/DeliveryInfoModal.tsx
// Modal para capturar datos de entrega a domicilio
// =================================================================
import React, { useState } from 'react';
import { MdClose, MdLocationOn, MdPhone, MdNotes } from 'react-icons/md';

interface DeliveryInfoModalProps {
  onClose: () => void;
  onConfirm: (deliveryData: {
    address: string;
    phone: string;
    notes?: string;
  }) => void;
}

const DeliveryInfoModal: React.FC<DeliveryInfoModalProps> = ({ onClose, onConfirm }) => {
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{
    address?: string;
    phone?: string;
  }>({});

  const validatePhone = (phoneNumber: string): boolean => {
    // Validar que sea un número de teléfono colombiano (10 dígitos)
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  const handleSubmit = () => {
    const newErrors: typeof errors = {};

    // Validar dirección
    if (!address.trim()) {
      newErrors.address = 'La dirección es obligatoria';
    } else if (address.trim().length < 10) {
      newErrors.address = 'La dirección debe tener al menos 10 caracteres';
    }

    // Validar teléfono
    if (!phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Debe ser un número de 10 dígitos';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Todo válido, confirmar
    onConfirm({
      address: address.trim(),
      phone: phone.replace(/\s/g, ''),
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-900 to-purple-800 text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🏍️</span>
              Datos de Entrega
            </h2>
            <p className="text-purple-200 text-sm">Domicilio</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-purple-800 rounded-full hover:bg-purple-700 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4">

          {/* Dirección */}
          <div>
            <label htmlFor="address" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MdLocationOn className="text-purple-600" size={20} />
              Dirección de Entrega *
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setErrors(prev => ({ ...prev, address: undefined }));
              }}
              placeholder="Ej: Calle 123 #45-67, Apto 301, Torre B"
              rows={3}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.address
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
              }`}
            />
            {errors.address && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <span>⚠️</span> {errors.address}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Incluye detalles como apartamento, torre, referencias
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MdPhone className="text-purple-600" size={20} />
              Teléfono de Contacto *
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => {
                // Permitir solo números
                const value = e.target.value.replace(/[^0-9]/g, '');
                setPhone(value);
                setErrors(prev => ({ ...prev, phone: undefined }));
              }}
              placeholder="3001234567"
              maxLength={10}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.phone
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
              }`}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <span>⚠️</span> {errors.phone}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              10 dígitos sin espacios
            </p>
          </div>

          {/* Notas (Opcional) */}
          <div>
            <label htmlFor="notes" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MdNotes className="text-purple-600" size={20} />
              Notas Adicionales (Opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Llamar al llegar, portería cerrada después de las 8pm"
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
            />
          </div>

          {/* Información adicional */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <p className="text-sm text-purple-800">
              <strong className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                Recuerda:
              </strong>
            </p>
            <ul className="text-xs text-purple-700 space-y-1 ml-6 list-disc">
              <li>Verifica que la dirección esté completa</li>
              <li>El teléfono debe estar disponible</li>
              <li>Todos los items serán empacados</li>
            </ul>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryInfoModal;

