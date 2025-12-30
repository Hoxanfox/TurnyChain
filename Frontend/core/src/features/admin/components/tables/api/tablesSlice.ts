// =================================================================
// ARCHIVO 4: /src/features/tables/tablesSlice.ts (NUEVO ARCHIVO)
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getTables, createTable } from './tablesAPI.ts';
import type { Table } from '../../../../../types/tables.ts';
import type { RootState } from '../../../../../app/store.ts';

interface TablesState {
  tables: Table[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TablesState = {
  tables: [],
  status: 'idle',
  error: null,
};

export const fetchTables = createAsyncThunk('tables/fetchTables', async (_, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try { return await getTables(token); }
  catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const addNewTable = createAsyncThunk('tables/addNewTable', async (tableNumber: number, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await createTable(tableNumber, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const tablesSlice = createSlice({
  name: 'tables',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTables.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchTables.fulfilled, (state, action: PayloadAction<Table[]>) => {
        state.status = 'succeeded';
        state.tables = action.payload || [];
      })
      .addCase(addNewTable.fulfilled, (state, action: PayloadAction<Table>) => {
        state.tables.push(action.payload);
      });
  },
});

export default tablesSlice.reducer;