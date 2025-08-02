// =================================================================
// ARCHIVO 7: /src/app/store.ts (ACTUALIZADO)
// Propósito: Añadir los nuevos reducers a la tienda de Redux.
// =================================================================
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice';
import menuReducer from '../features/menu/menuSlice';     // <-- 1. IMPORTAR
import ordersReducer from '../features/orders/ordersSlice'; // <-- 2. IMPORTAR

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    menu: menuReducer,     // <-- 3. AÑADIR
    orders: ordersReducer, // <-- 4. AÑADIR
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;