import React from 'react';

export const CashierMobileLoading: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
      <p className="text-gray-600 text-lg">Cargando ordenes...</p>
    </div>
  </div>
);
