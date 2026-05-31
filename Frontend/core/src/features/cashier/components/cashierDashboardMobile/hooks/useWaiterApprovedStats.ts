import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../../app/store';
import {
  fetchWaiterStatsThunk,
  resetWaiterStats,
  setDayValue,
  setFilterMode,
  setMonthValue,
  setRangeFrom,
  setRangeTo,
} from '../api/waiterStatsSlice';
import type { WaiterStatsFilterMode } from '../types/waiterStatsTypes';

export const useWaiterApprovedStats = () => {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector((root: RootState) => root.waiterStats);

  const refresh = useCallback(() => {
    dispatch(fetchWaiterStatsThunk());
  }, [dispatch]);

  const applyFilters = useCallback(() => {
    dispatch(fetchWaiterStatsThunk());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetWaiterStats());
  }, [dispatch]);

  return {
    ...state,
    refresh,
    applyFilters,
    reset,
    setFilterMode: (value: WaiterStatsFilterMode) => dispatch(setFilterMode(value)),
    setDayValue: (value: string) => dispatch(setDayValue(value)),
    setMonthValue: (value: string) => dispatch(setMonthValue(value)),
    setRangeFrom: (value: string) => dispatch(setRangeFrom(value)),
    setRangeTo: (value: string) => dispatch(setRangeTo(value)),
  };
};
