import React from 'react';
import type { InvoiceHistoryItem } from '../types/invoiceHistoryTypes';
import { EXPLORER_BASE_URL, formatDate, formatMoney, shortText } from '../utils/invoiceHistoryFormatters';

interface InvoiceHistoryCardProps {
  item: InvoiceHistoryItem;
}

export const InvoiceHistoryCard: React.FC<InvoiceHistoryCardProps> = ({ item }) => {
  const hash = item.blockchain_tx_hash || '';
  const explorerUrl = hash ? `${EXPLORER_BASE_URL}/${hash}` : '';

  return (
    <article className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mesa {item.table_number}</h2>
          <p className="text-xs text-gray-500">Orden: {shortText(item.order_id, 12)}</p>
          <p className="text-xs text-gray-500">Fecha: {formatDate(item.updated_at)}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-emerald-600">{formatMoney(item.total)}</p>
          <p className="text-xs text-gray-500">{item.payment_method || 'N/D'}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
            {item.status}
          </span>
          {item.waiter_name && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
              Mesero: {item.waiter_name}
            </span>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Hash Arbitrum</p>
          {hash ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm font-mono text-gray-700">{shortText(hash, 14)}</span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Ver en Arbiscan →
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin hash registrado</p>
          )}
        </div>
      </div>
    </article>
  );
};
