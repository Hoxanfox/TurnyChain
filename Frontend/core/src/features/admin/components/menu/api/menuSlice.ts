// =================================================================
// ARCHIVO 3: /src/features/menu/menuSlice.ts (CORREGIDO)
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, type MenuItemPayload } from './menuAPI.ts';
import type { MenuItem } from '../../../../../types/menu.ts';
import type { RootState } from '../../../../../app/store.ts';

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

export const addNewMenuItem = createAsyncThunk('menu/addNew', async (itemData: MenuItemPayload, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await createMenuItem(itemData, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const updateExistingMenuItem = createAsyncThunk('menu/updateExisting', async ({ id, itemData }: { id: string, itemData: MenuItemPayload }, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await updateMenuItem(id, itemData, token); }
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
    // CORRECCIÓN: Añadimos los reducers para las actualizaciones en tiempo real.
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
      // Fetch menu
      .addCase(fetchMenu.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchMenu.fulfilled, (state, action: PayloadAction<MenuItem[]>) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchMenu.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })

      // Add new menu item
      .addCase(addNewMenuItem.pending, (state) => { state.status = 'loading'; })
      .addCase(addNewMenuItem.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(addNewMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })

      // Update existing menu item
      .addCase(updateExistingMenuItem.pending, (state) => { state.status = 'loading'; })
      .addCase(updateExistingMenuItem.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateExistingMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })

      // Soft delete menu item
      .addCase(softDeleteMenuItem.pending, (state) => { state.status = 'loading'; })
      .addCase(softDeleteMenuItem.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.status = 'succeeded';
        state.items = state.items.filter(item => item.id !== action.payload.id);
      })
      .addCase(softDeleteMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; });
  },
});

// CORRECCIÓN: Exportamos las nuevas acciones.
export const { menuItemAdded, menuItemUpdated, menuItemRemoved } = menuSlice.actions;
export default menuSlice.reducer;