import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../app/store';
import { fetchWaiterApprovedStats } from './waiterStatsApi';
import type { WaiterApprovedStat, WaiterStatsFilterMode } from '../types/waiterStatsTypes';

interface WaiterStatsState {
  items: WaiterApprovedStat[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  filterMode: WaiterStatsFilterMode;
  dayValue: string;
  monthValue: string;
  rangeFrom: string;
  rangeTo: string;
}

const todayIso = new Date().toISOString().slice(0, 10);
const monthIso = new Date().toISOString().slice(0, 7);

const initialState: WaiterStatsState = {
  items: [],
  status: 'idle',
  error: null,
  filterMode: 'day',
  dayValue: todayIso,
  monthValue: monthIso,
  rangeFrom: todayIso,
  rangeTo: todayIso,
};

export const fetchWaiterStatsThunk = createAsyncThunk(
  'waiterStats/fetch',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const token = state.auth.token;
    const waiterStats = state.waiterStats;

    if (!token) {
      return rejectWithValue('No se encontró el token');
    }

    const params = {
      token,
      day: waiterStats.filterMode === 'day' ? waiterStats.dayValue : undefined,
      month: waiterStats.filterMode === 'month' ? waiterStats.monthValue : undefined,
      from: waiterStats.filterMode === 'range' ? waiterStats.rangeFrom : undefined,
      to: waiterStats.filterMode === 'range' ? waiterStats.rangeTo : undefined,
    };

    try {
      return await fetchWaiterApprovedStats(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'No se pudieron cargar los datos');
    }
  }
);

const waiterStatsSlice = createSlice({
  name: 'waiterStats',
  initialState,
  reducers: {
    setFilterMode: (state, action: PayloadAction<WaiterStatsFilterMode>) => {
      state.filterMode = action.payload;
    },
    setDayValue: (state, action: PayloadAction<string>) => {
      state.dayValue = action.payload;
    },
    setMonthValue: (state, action: PayloadAction<string>) => {
      state.monthValue = action.payload;
    },
    setRangeFrom: (state, action: PayloadAction<string>) => {
      state.rangeFrom = action.payload;
    },
    setRangeTo: (state, action: PayloadAction<string>) => {
      state.rangeTo = action.payload;
    },
    resetWaiterStats: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWaiterStatsThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWaiterStatsThunk.fulfilled, (state, action: PayloadAction<WaiterApprovedStat[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchWaiterStatsThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const {
  setFilterMode,
  setDayValue,
  setMonthValue,
  setRangeFrom,
  setRangeTo,
  resetWaiterStats,
} = waiterStatsSlice.actions;

export default waiterStatsSlice.reducer;
