import React from 'react';
import type { InvoiceHistoryItem, InvoiceHistorySummary } from '../types/invoiceHistoryTypes';
import { InvoiceHistoryList } from './InvoiceHistoryList';
import { InvoiceHistorySummary as SummaryCard } from './InvoiceHistorySummary';

interface InvoiceHistoryContentProps {
  summary: InvoiceHistorySummary;
  hasResults: boolean;
  items: InvoiceHistoryItem[];
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export const InvoiceHistoryContent: React.FC<InvoiceHistoryContentProps> = ({
  summary,
  hasResults,
  items,
  hasMore,
  isLoading,
  onLoadMore,
}) => (
  <>
    <SummaryCard count={summary.count} total={summary.total} />
    {hasResults && (
      <InvoiceHistoryList
        items={items}
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={onLoadMore}
      />
    )}
  </>
);
