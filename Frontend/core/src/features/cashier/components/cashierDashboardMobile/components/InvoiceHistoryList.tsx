import React from 'react';
import type { InvoiceHistoryItem } from '../types/invoiceHistoryTypes';
import { InvoiceHistoryCard } from './InvoiceHistoryCard';

interface InvoiceHistoryListProps {
  items: InvoiceHistoryItem[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export const InvoiceHistoryList: React.FC<InvoiceHistoryListProps> = ({
  items,
  hasMore,
  isLoading,
  onLoadMore,
}) => (
  <div className="space-y-4">
    {items.map((item) => (
      <InvoiceHistoryCard key={item.order_id} item={item} />
    ))}
    {hasMore && (
      <button
        type="button"
        onClick={onLoadMore}
        className="w-full px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100 transition-colors"
        disabled={isLoading}
      >
        Cargar mas
      </button>
    )}
  </div>
);
