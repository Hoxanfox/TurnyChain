// =================================================================
// ARCHIVO 6: /src/features/menu/menuSlice.ts (CORREGIDO)
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from './menuAPI';
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
    try { return await getMenuItems(token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const addNewMenuItem = createAsyncThunk('menu/addNew', async (itemData: Omit<MenuItem, 'id' | 'is_available'>, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await createMenuItem(itemData, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const updateExistingMenuItem = createAsyncThunk('menu/updateExisting', async (itemData: MenuItem, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await updateMenuItem(itemData, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const softDeleteMenuItem = createAsyncThunk('menu/softDelete', async (itemId: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await deleteMenuItem(itemId, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    menuItemAdded: (state, action: PayloadAction<MenuItem>) => {
      if (!state.items.find(item => item.id === action.payload.id)) {
        state.items.push(action.payload);
      }
    },
    menuItemUpdated: (state, action: PayloadAction<MenuItem>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    menuItemRemoved: (state, action: PayloadAction<{ id: string }>) => {
      state.items = state.items.filter(item => item.id !== action.payload.id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchMenu.fulfilled, (state, action: PayloadAction<MenuItem[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchMenu.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })
      // CORRECCIÓN: Se añaden guiones bajos para indicar que los parámetros no se usan.
      .addCase(addNewMenuItem.fulfilled, (_state, _action) => {
        // La actualización ahora se maneja por WebSocket.
      })
      .addCase(updateExistingMenuItem.fulfilled, (_state, _action) => {
        // La actualización ahora se maneja por WebSocket.
      })
      .addCase(softDeleteMenuItem.fulfilled, (_state, _action) => {
        // La actualización ahora se maneja por WebSocket.
      });
  },
});

export const { menuItemAdded, menuItemUpdated, menuItemRemoved } = menuSlice.actions;
export default menuSlice.reducer;
