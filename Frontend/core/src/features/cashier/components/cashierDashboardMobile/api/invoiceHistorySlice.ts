import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../../../app/store';
import type { FilterMode, InvoiceHistoryItem } from '../types/invoiceHistoryTypes';
import { DEFAULT_LIMIT, buildInvoiceHistoryCacheKey, getMonthValue, getTodayValue } from '../utils/invoiceHistoryFormatters';
import { fetchInvoiceHistory } from './invoiceHistoryApi';

interface InvoiceHistoryCacheEntry {
  items: InvoiceHistoryItem[];
  offset: number;
  hasMore: boolean;
  updatedAt: number;
}

interface InvoiceHistoryState {
  items: InvoiceHistoryItem[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  query: string;
  filterMode: FilterMode;
  dayValue: string;
  monthValue: string;
  limit: number;
  offset: number;
  hasMore: boolean;
  cache: Record<string, InvoiceHistoryCacheEntry>;
}

const initialState: InvoiceHistoryState = {
  items: [],
  status: 'idle',
  error: null,
  query: '',
  filterMode: 'day',
  dayValue: getTodayValue(),
  monthValue: getMonthValue(),
  limit: DEFAULT_LIMIT,
  offset: 0,
  hasMore: false,
  cache: {},
};

interface FetchParams {
  append?: boolean;
  offset?: number;
}

interface FetchPayload {
  items: InvoiceHistoryItem[];
  append: boolean;
  offset: number;
  cacheKey: string;
}

export const fetchInvoiceHistoryThunk = createAsyncThunk<FetchPayload, FetchParams | undefined, { state: RootState }>(
  'invoiceHistory/fetch',
  async (params, { getState, rejectWithValue }) => {
    const state = getState();
    const token = state.auth.token;
    if (!token) {
      return rejectWithValue('No se encontro el token de sesion.');
    }

    const historyState = state.invoiceHistory;
    const append = params?.append ?? false;
    const offset = params?.offset ?? (append ? historyState.offset + historyState.limit : 0);

    const day = historyState.filterMode === 'day' ? historyState.dayValue : undefined;
    const month = historyState.filterMode === 'month' ? historyState.monthValue : undefined;
    const cacheKey = buildInvoiceHistoryCacheKey({
      query: historyState.query,
      filterMode: historyState.filterMode,
      dayValue: historyState.dayValue,
      monthValue: historyState.monthValue,
    });

    const items = await fetchInvoiceHistory({
      token,
      query: historyState.query,
      limit: historyState.limit,
      offset,
      day,
      month,
    });

    return { items, append, offset, cacheKey };
  }
);

const invoiceHistorySlice = createSlice({
  name: 'invoiceHistory',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    setFilterMode: (state, action: PayloadAction<FilterMode>) => {
      state.filterMode = action.payload;
    },
    setDayValue: (state, action: PayloadAction<string>) => {
      state.dayValue = action.payload;
    },
    setMonthValue: (state, action: PayloadAction<string>) => {
      state.monthValue = action.payload;
    },
    restoreFromCache: (state, action: PayloadAction<string>) => {
      const entry = state.cache[action.payload];
      if (!entry) return;
      state.items = entry.items;
      state.offset = entry.offset;
      state.hasMore = entry.hasMore;
      state.status = 'succeeded';
      state.error = null;
    },
    resetResults: (state) => {
      state.items = [];
      state.offset = 0;
      state.hasMore = false;
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoiceHistoryThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchInvoiceHistoryThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        const hasMore = action.payload.items.length === state.limit;
        state.offset = action.payload.offset;
        state.hasMore = hasMore;
        const nextItems = action.payload.append
          ? [...state.items, ...action.payload.items]
          : action.payload.items;
        state.items = nextItems;
        state.cache[action.payload.cacheKey] = {
          items: nextItems,
          offset: action.payload.offset,
          hasMore,
          updatedAt: Date.now(),
        };
      })
      .addCase(fetchInvoiceHistoryThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'No se pudo cargar el historial.';
      });
  },
});

export const {
  setQuery,
  setFilterMode,
  setDayValue,
  setMonthValue,
  restoreFromCache,
  resetResults,
} = invoiceHistorySlice.actions;
export default invoiceHistorySlice.reducer;
