import React from 'react';

interface InvoiceHistoryErrorProps {
  message: string;
}

export const InvoiceHistoryError: React.FC<InvoiceHistoryErrorProps> = ({ message }) => (
  <div className="bg-white rounded-2xl shadow p-6 text-center">
    <p className="text-red-600 font-semibold">{message}</p>
  </div>
);
