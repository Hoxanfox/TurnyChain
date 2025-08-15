// =================================================================
// ARCHIVO 10: /src/features/accompaniments/accompanimentsSlice.ts
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getAccompaniments, createAccompaniment, updateAccompaniment, deleteAccompaniment } from './accompanimentsAPI';
import type { Accompaniment } from '../../types/accompaniments';
import type { RootState } from '../../app/store';

interface AccompanimentsState { items: Accompaniment[]; status: 'idle' | 'loading' | 'succeeded' | 'failed'; error: string | null; }
const initialStateAccompaniments: AccompanimentsState = { items: [], status: 'idle', error: null };

export const fetchAccompaniments = createAsyncThunk('accompaniments/fetchAll', async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await getAccompaniments(token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});
export const addNewAccompaniment = createAsyncThunk('accompaniments/addNew', async (data: { name: string, price: number }, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await createAccompaniment(data, token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});
export const updateExistingAccompaniment = createAsyncThunk('accompaniments/update', async (accompaniment: Accompaniment, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await updateAccompaniment(accompaniment, token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});
export const removeAccompaniment = createAsyncThunk('accompaniments/delete', async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await deleteAccompaniment(id, token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});

export const accompanimentsSlice = createSlice({
  name: 'accompaniments',
  initialState: initialStateAccompaniments,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccompaniments.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchAccompaniments.fulfilled, (state, action: PayloadAction<Accompaniment[]>) => { state.items = action.payload; state.status = 'succeeded'; })
      .addCase(fetchAccompaniments.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })
      .addCase(addNewAccompaniment.fulfilled, (state, action: PayloadAction<Accompaniment>) => { state.items.push(action.payload); })
      .addCase(updateExistingAccompaniment.fulfilled, (state, action: PayloadAction<Accompaniment>) => {
        const index = state.items.findIndex(a => a.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeAccompaniment.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.items = state.items.filter(a => a.id !== action.payload.id);
      });
  },
});

export default accompanimentsSlice.reducer;