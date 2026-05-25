import React from 'react';
import { InvoiceHistoryEmpty } from './InvoiceHistoryEmpty';
import { InvoiceHistoryError } from './InvoiceHistoryError';
import { InvoiceHistoryLoading } from './InvoiceHistoryLoading';

interface InvoiceHistoryStatesProps {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  hasResults: boolean;
}

export const InvoiceHistoryStates: React.FC<InvoiceHistoryStatesProps> = ({
  status,
  error,
  hasResults,
}) => {
  if (status === 'loading') {
    return <InvoiceHistoryLoading />;
  }
  if (status === 'failed' && error) {
    return <InvoiceHistoryError message={error} />;
  }
  if (!hasResults) {
    return <InvoiceHistoryEmpty />;
  }
  return null;
};
