import React from 'react';

interface BlockchainStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount: number;
}

export const BlockchainStatusModal: React.FC<BlockchainStatusModalProps> = ({
  isOpen,
  onClose,
  pendingCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔗</span>
            <h2 className="text-2xl font-bold">Estado Blockchain</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center">
            <div className="text-indigo-800 font-bold text-5xl mb-2">
              {pendingCount}
            </div>
            <p className="text-indigo-600 font-semibold text-lg">
              Órdenes pendientes por notarizar
            </p>
          </div>

          <p className="text-gray-600 mt-6 text-sm text-center">
            El sistema notariza automáticamente las órdenes pagadas en la blockchain después de 1 hora (tiempo de gracia para posibles ediciones).
          </p>

          <button
            onClick={onClose}
            className="w-full mt-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
