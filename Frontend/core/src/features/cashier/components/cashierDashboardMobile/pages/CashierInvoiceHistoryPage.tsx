import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceHistoryContent } from '../components/InvoiceHistoryContent';
import { InvoiceHistoryFilters } from '../components/InvoiceHistoryFilters';
import { InvoiceHistoryHeader } from '../components/InvoiceHistoryHeader';
import { InvoiceHistoryStates } from '../components/InvoiceHistoryStates';
import { useInvoiceHistory } from '../hooks/useInvoiceHistory';

const CashierInvoiceHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    status,
    error,
    query,
    filterMode,
    dayValue,
    monthValue,
    limit,
    hasMore,
    summary,
    setQuery,
    setFilterMode,
    setDayValue,
    setMonthValue,
    refresh,
    applyFilters,
    clearQuery,
    loadMore,
  } = useInvoiceHistory();

  const hasResults = items.length > 0;
  const isLoading = status === 'loading';
  const showSummary = status !== 'loading' && !(status === 'failed' && error);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50 p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-4">
        <InvoiceHistoryHeader onBack={() => navigate('/dashboard')} />
        <InvoiceHistoryFilters
          query={query}
          filterMode={filterMode}
          dayValue={dayValue}
          monthValue={monthValue}
          limit={limit}
          onFilterModeChange={setFilterMode}
          onDayChange={setDayValue}
          onMonthChange={setMonthValue}
          onQueryChange={setQuery}
          onSubmit={applyFilters}
          onClear={clearQuery}
        />

        <InvoiceHistoryStates status={status} error={error} hasResults={hasResults} />

        {showSummary && (
          <InvoiceHistoryContent
            summary={summary}
            hasResults={hasResults}
            items={items}
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </div>
  );
};

export default CashierInvoiceHistoryPage;
