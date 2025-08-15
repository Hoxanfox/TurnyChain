// =================================================================
// ARCHIVO 7: /src/features/ingredients/ingredientsSlice.ts (CORREGIDO)
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient } from './ingredientsAPI';
import type { Ingredient } from '../../types/ingredients';
import type { RootState } from '../../app/store';

interface IngredientsState { items: Ingredient[]; status: 'idle' | 'loading' | 'succeeded' | 'failed'; error: string | null; }
const initialStateIngredients: IngredientsState = { items: [], status: 'idle', error: null };

export const fetchIngredients = createAsyncThunk('ingredients/fetchAll', async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await getIngredients(token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});
export const addNewIngredient = createAsyncThunk('ingredients/addNew', async (name: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await createIngredient(name, token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});
export const updateExistingIngredient = createAsyncThunk('ingredients/update', async (ingredient: Ingredient, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await updateIngredient(ingredient, token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});
export const removeIngredient = createAsyncThunk('ingredients/delete', async (id: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token; if (!token) return rejectWithValue('No token');
    try { return await deleteIngredient(id, token); } catch(e: any) { return rejectWithValue(e.response.data.error); }
});

export const ingredientsSlice = createSlice({
  name: 'ingredients',
  initialState: initialStateIngredients,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngredients.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchIngredients.fulfilled, (state, action: PayloadAction<Ingredient[]>) => { state.items = action.payload; state.status = 'succeeded'; })
      .addCase(fetchIngredients.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })
      .addCase(addNewIngredient.fulfilled, (state, action: PayloadAction<Ingredient>) => { state.items.push(action.payload); })
      .addCase(updateExistingIngredient.fulfilled, (state, action: PayloadAction<Ingredient>) => {
        const index = state.items.findIndex(i => i.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeIngredient.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.items = state.items.filter(i => i.id !== action.payload.id);
      });
  },
});

export default ingredientsSlice.reducer;