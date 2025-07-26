// =================================================================
// ARCHIVO 7: /src/app/store.ts (ACTUALIZADO)
// Propósito: Añadir el nuevo 'usersReducer' a la tienda de Redux.
// =================================================================
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice'; // <-- 1. IMPORTAR

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer, // <-- 2. AÑADIR
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;