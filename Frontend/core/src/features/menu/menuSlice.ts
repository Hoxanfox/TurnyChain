
// =================================================================
// ARCHIVO 4: /src/features/menu/menuSlice.ts (NUEVO ARCHIVO)
// Propósito: Slice de Redux para manejar el estado del menú.
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getMenuItems } from './menuAPI';
import type { MenuItem } from '../../types/menu';
import type { RootState } from '../../app/store';

interface MenuState {
  items: MenuItem[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: MenuState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchMenu = createAsyncThunk('menu/fetchMenu', async (_, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try {
    return await getMenuItems(token);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'No se pudo cargar el menú');
  }
});

export const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMenu.fulfilled, (state, action: PayloadAction<MenuItem[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchMenu.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export default menuSlice.reducer;
