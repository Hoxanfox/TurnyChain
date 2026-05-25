import React from 'react';

interface InvoiceHistoryHeaderProps {
  onBack: () => void;
}

export const InvoiceHistoryHeader: React.FC<InvoiceHistoryHeaderProps> = ({ onBack }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Facturas</h1>
        <p className="text-sm text-gray-600">Busca por ID de orden o hash de Arbitrum.</p>
      </div>
      <button
        onClick={onBack}
        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
      >
        ← Volver
      </button>
    </div>
  </div>
);
