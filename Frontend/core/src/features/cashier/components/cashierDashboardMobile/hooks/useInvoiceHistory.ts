import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../../app/store';
import type { InvoiceHistorySummary } from '../types/invoiceHistoryTypes';
import { buildInvoiceHistoryCacheKey } from '../utils/invoiceHistoryFormatters';
import {
  fetchInvoiceHistoryThunk,
  restoreFromCache,
  resetResults,
  setDayValue,
  setFilterMode,
  setMonthValue,
  setQuery,
} from '../api/invoiceHistorySlice';

export const useInvoiceHistory = () => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((root: RootState) => root.invoiceHistory);

  const summary: InvoiceHistorySummary = useMemo(() => {
    const total = state.items.reduce((sum, item) => sum + item.total, 0);
    return {
      count: state.items.length,
      total,
    };
  }, [state.items]);

  const cacheKey = useMemo(() => buildInvoiceHistoryCacheKey({
    query: state.query,
    filterMode: state.filterMode,
    dayValue: state.dayValue,
    monthValue: state.monthValue,
  }), [state.query, state.filterMode, state.dayValue, state.monthValue]);

  const loadOrRestore = useCallback((append: boolean, overrideQuery?: string) => {
    if (append) {
      dispatch(fetchInvoiceHistoryThunk({ append: true }));
      return;
    }

    const nextKey = buildInvoiceHistoryCacheKey({
      query: overrideQuery ?? state.query,
      filterMode: state.filterMode,
      dayValue: state.dayValue,
      monthValue: state.monthValue,
    });

    if (state.cache[nextKey]) {
      dispatch(restoreFromCache(nextKey));
      return;
    }

    dispatch(fetchInvoiceHistoryThunk({ append: false, offset: 0 }));
  }, [dispatch, state.query, state.filterMode, state.dayValue, state.monthValue, state.cache]);

  const refresh = useCallback(() => {
    loadOrRestore(false);
  }, [loadOrRestore]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.status === 'loading') return;
    loadOrRestore(true);
  }, [loadOrRestore, state.hasMore, state.status]);

  const applyFilters = useCallback(() => {
    loadOrRestore(false);
  }, [loadOrRestore]);

  const clearQuery = useCallback(() => {
    dispatch(setQuery(''));
    loadOrRestore(false, '');
  }, [dispatch, loadOrRestore]);

  const reset = useCallback(() => {
    dispatch(resetResults());
  }, [dispatch]);

  return {
    ...state,
    cacheKey,
    summary,
    setQuery: (value: string) => dispatch(setQuery(value)),
    setFilterMode: (value: 'day' | 'month') => dispatch(setFilterMode(value)),
    setDayValue: (value: string) => dispatch(setDayValue(value)),
    setMonthValue: (value: string) => dispatch(setMonthValue(value)),
    refresh,
    loadMore,
    applyFilters,
    clearQuery,
    reset,
  };
};
