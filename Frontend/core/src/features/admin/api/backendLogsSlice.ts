import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface BackendErrorLog {
  timestamp: string;
  message: string;
  method?: string;
  path?: string;
  status?: number;
}

interface BackendLogsState {
  items: BackendErrorLog[];
}

const initialState: BackendLogsState = {
  items: [],
};

const MAX_LOG_ITEMS = 150;

const backendLogsSlice = createSlice({
  name: 'backendLogs',
  initialState,
  reducers: {
    backendErrorReceived: (state, action: PayloadAction<BackendErrorLog>) => {
      state.items.unshift(action.payload);
      if (state.items.length > MAX_LOG_ITEMS) {
        state.items = state.items.slice(0, MAX_LOG_ITEMS);
      }
    },
    clearBackendErrors: (state) => {
      state.items = [];
    },
  },
});

export const { backendErrorReceived, clearBackendErrors } = backendLogsSlice.actions;
export default backendLogsSlice.reducer;
