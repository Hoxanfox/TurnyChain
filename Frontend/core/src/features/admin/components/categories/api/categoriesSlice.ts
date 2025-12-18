// =================================================================
// ARCHIVO 6: /src/features/categories/categoriesSlice.ts (CRUD COMPLETO)
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getCategories, createCategory, updateCategory, deleteCategory } from './categoriesAPI.ts';
import type { Category } from '../../../../../types/categories.ts';
import type { RootState } from '../../../../../app/store.ts';

interface CategoriesState { items: Category[]; status: 'idle' | 'loading' | 'succeeded' | 'failed'; error: string | null; }
const initialState: CategoriesState = { items: [], status: 'idle', error: null };

export const fetchCategories = createAsyncThunk('categories/fetchAll', async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token'); 
    try { return await getCategories(token); } catch (e: any) { return rejectWithValue(e.response.data.error); }
});
export const addNewCategory = createAsyncThunk('categories/addNew', async (name: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await createCategory(name, token); } catch (e: any) { return rejectWithValue(e.response.data.error); }
});
export const updateExistingCategory = createAsyncThunk('categories/update', async (category: Category, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await updateCategory(category, token); } catch (e: any) { return rejectWithValue(e.response.data.error); }
});
export const removeCategory = createAsyncThunk('categories/delete', async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await deleteCategory(id, token); } catch (e: any) { return rejectWithValue(e.response.data.error); }
});

export const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.status = 'succeeded'; state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })
      .addCase(addNewCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.items.push(action.payload);
      })
      .addCase(updateExistingCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        const index = state.items.findIndex(cat => cat.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeCategory.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.items = state.items.filter(cat => cat.id !== action.payload.id);
      });
  },
});

export default categoriesSlice.reducer;