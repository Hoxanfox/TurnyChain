// =================================================================
// ARCHIVO 11: /src/app/store.ts (CORREGIDO)
// =================================================================
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/usersSlice';
import menuReducer from '../features/menu/menuSlice';
import ordersReducer from '../features/orders/ordersSlice';
import tablesReducer from '../features/tables/tablesSlice';
import categoriesReducer from '../features/categories/categoriesSlice';
import ingredientsReducer from '../features/ingredients/ingredientsSlice';
import accompanimentsReducer from '../features/accompaniments/accompanimentsSlice';

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