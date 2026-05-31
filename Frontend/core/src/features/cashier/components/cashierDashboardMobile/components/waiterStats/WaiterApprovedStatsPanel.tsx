import React, { useEffect } from 'react';
import { CashierMobileLoading } from '../CashierMobileLoading';
import { CashierMobileError } from '../CashierMobileError';
import { useWaiterApprovedStats } from '../../hooks/useWaiterApprovedStats';
import { WaiterApprovedStatsFilters } from './WaiterApprovedStatsFilters';
import { WaiterApprovedStatsList } from './WaiterApprovedStatsList';

export const WaiterApprovedStatsPanel: React.FC = () => {
  const {
    items,
    status,
    error,
    filterMode,
    dayValue,
    monthValue,
    rangeFrom,
    rangeTo,
    setFilterMode,
    setDayValue,
    setMonthValue,
    setRangeFrom,
    setRangeTo,
    refresh,
    applyFilters,
  } = useWaiterApprovedStats();

  useEffect(() => {
    if (status === 'idle') {
      refresh();
    }
  }, [status, refresh]);

  if (status === 'loading') {
    return <CashierMobileLoading />;
  }

  if (status === 'failed') {
    return <CashierMobileError onRetry={refresh} message={error || 'No se pudo cargar el resumen.'} />;
  }

  return (
    <div className="p-4 space-y-4">
      <WaiterApprovedStatsFilters
        filterMode={filterMode}
        dayValue={dayValue}
        monthValue={monthValue}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onFilterModeChange={setFilterMode}
        onDayChange={setDayValue}
        onMonthChange={setMonthValue}
        onRangeFromChange={setRangeFrom}
        onRangeToChange={setRangeTo}
        onApply={applyFilters}
      />
      <WaiterApprovedStatsList items={items} />
    </div>
  );
};
