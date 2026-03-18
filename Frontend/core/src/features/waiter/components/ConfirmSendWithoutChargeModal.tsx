import React from 'react';

interface ConfirmSendWithoutChargeModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmSendWithoutChargeModal: React.FC<ConfirmSendWithoutChargeModalProps> = ({
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-700 to-amber-600 text-white px-5 py-4">
          <h2 className="text-lg font-bold">Enviar sin cobrar</h2>
          <p className="text-amber-100 text-sm mt-1">Confirma antes de continuar</p>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Esta comanda se enviara sin registrar pago y quedara pendiente por cobrar.
            <br />
            <span className="font-semibold text-gray-900">Deseas continuar?</span>
          </p>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
          >
            Volver y cobrar primero
          </button>
          <button
            onClick={onConfirm}
            className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
          >
            Si, enviar sin cobrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSendWithoutChargeModal;
