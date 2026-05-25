import React from 'react';
import { formatMoney } from '../utils/invoiceHistoryFormatters';

interface InvoiceHistorySummaryProps {
  count: number;
  total: number;
}

export const InvoiceHistorySummary: React.FC<InvoiceHistorySummaryProps> = ({ count, total }) => (
  <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    <p className="text-sm text-gray-600">
      {count} factura{count === 1 ? '' : 's'} encontrada{count === 1 ? '' : 's'}
    </p>
    <p className="text-lg font-bold text-emerald-700">{formatMoney(total)}</p>
  </div>
);
