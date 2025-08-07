// =================================================================
// ARCHIVO 9: /src/app/store.ts (ACTUALIZADO)
// =================================================================
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice';
import menuReducer from '../features/menu/menuSlice';
import ordersReducer from '../features/orders/ordersSlice';
import tablesReducer from '../features/tables/tablesSlice'; // <-- NUEVO

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    menu: menuReducer,
    orders: ordersReducer,
    tables: tablesReducer, // <-- NUEVO
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;