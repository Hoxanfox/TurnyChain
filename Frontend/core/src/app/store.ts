// =================================================================
// ARCHIVO 11: /src/app/store.ts (CORREGIDO)
// =================================================================
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/api/usersSlice.ts';
import menuReducer from '../features/admin/components/menu/api/menuSlice.ts';
import ordersReducer from '../features/shared/orders/api/ordersSlice.ts';
import tablesReducer from '../features/admin/components/tables/api/tablesSlice.ts';
import categoriesReducer from '../features/admin/components/categories/api/categoriesSlice.ts';
import ingredientsReducer from '../features/admin/components/ingredients/api/ingredientsSlice.ts';
import accompanimentsReducer from '../features/admin/components/accompaniments/api/accompanimentsSlice.ts';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    menu: menuReducer,
    orders: ordersReducer,
    tables: tablesReducer,
    categories: categoriesReducer,
    ingredients: ingredientsReducer,
    accompaniments: accompanimentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;