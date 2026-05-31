// =================================================================
// ARCHIVO 11: /src/app/store.ts (CORREGIDO)
// =================================================================
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import usersReducer from '../features/users/api/usersSlice.ts';
import menuReducer from '../features/admin/components/menu/api/menuSlice.ts';
import ordersReducer from '../features/shared/orders/api/ordersSlice.ts';
import tablesReducer from '../features/admin/components/tables/api/tablesSlice.ts';
import categoriesReducer from '../features/admin/components/categories/api/categoriesSlice.ts';
import ingredientsReducer from '../features/admin/components/ingredients/api/ingredientsSlice.ts';
import accompanimentsReducer from '../features/admin/components/accompaniments/api/accompanimentsSlice.ts';
import backendLogsReducer from '../features/admin/api/backendLogsSlice.ts';
import invoiceHistoryReducer from '../features/cashier/components/cashierDashboardMobile/api/invoiceHistorySlice';
import waiterStatsReducer from '../features/cashier/components/cashierDashboardMobile/api/waiterStatsSlice';

const appReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,
  menu: menuReducer,
  orders: ordersReducer,
  tables: tablesReducer,
  categories: categoriesReducer,
  ingredients: ingredientsReducer,
  accompaniments: accompanimentsReducer,
  backendLogs: backendLogsReducer,
  invoiceHistory: invoiceHistoryReducer,
  waiterStats: waiterStatsReducer,
});

const rootReducer: typeof appReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;