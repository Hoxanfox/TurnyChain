// =================================================================
// ARCHIVO 3: /src/features/users/usersSlice.ts (ACTUALIZADO)
// Propósito: Añadir thunks y lógica para actualizar y eliminar usuarios.
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getUsers, createUser, updateUser, deleteUser } from './usersAPI.ts';
import type { User, NewUser, UpdateUser } from '../../../types/users.ts';
import type { RootState } from '../../../app/store.ts';

interface UsersState {
  users: User[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  status: 'idle',
  error: null,
};

// --- Thunks Asíncronos ---
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (_, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try { return await getUsers(token); }
  catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const addNewUser = createAsyncThunk('users/addNewUser', async (newUser: NewUser, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try { return await createUser(newUser, token); }
  catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const editUser = createAsyncThunk('users/editUser', async (userToUpdate: UpdateUser, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try { return await updateUser(userToUpdate, token); }
  catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const removeUser = createAsyncThunk('users/removeUser', async (userId: string, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try { return await deleteUser(userId, token); }
  catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

// --- Slice de Usuarios ---
export const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.status = 'succeeded';
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Add New User
      .addCase(addNewUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.users.push(action.payload);
      })
      // Edit User
      .addCase(editUser.fulfilled, (state, action: PayloadAction<User>) => {
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      // Remove User
      .addCase(removeUser.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.users = state.users.filter(user => user.id !== action.payload.id);
      });
  },
});

export default usersSlice.reducer;
