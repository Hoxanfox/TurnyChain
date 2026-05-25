import React from 'react';

export const InvoiceHistoryEmpty: React.FC = () => (
  <div className="bg-white rounded-2xl shadow p-10 text-center">
    <p className="text-5xl mb-3">🧾</p>
    <p className="text-lg font-semibold text-gray-800">No hay resultados en el historial.</p>
    <p className="text-sm text-gray-500 mt-2">Prueba con otro hash o ID.</p>
  </div>
);
