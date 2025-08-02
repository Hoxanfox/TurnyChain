// =================================================================
// ARCHIVO 3: /src/features/orders/ordersSlice.ts (ACTUALIZADO)
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { createOrder, getOrders, getOrderDetails, updateOrderStatus, manageOrderAsAdmin } from './ordersAPI';
import type { Order, NewOrderPayload } from '../../types/orders';
import type { RootState } from '../../app/store';

interface OrdersState {
  activeOrders: Order[];
  myOrders: Order[];
  selectedOrderDetails: Order | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  myOrdersStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  detailsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: OrdersState = {
  activeOrders: [],
  myOrders: [],
  selectedOrderDetails: null,
  status: 'idle',
  myOrdersStatus: 'idle',
  detailsStatus: 'idle',
  error: null,
};

export const fetchActiveOrders = createAsyncThunk('orders/fetchActive', async (_, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try { return await getOrders(token); }
  catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const fetchMyOrders = createAsyncThunk('orders/fetchMyOrders', async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await getOrders(token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const fetchOrderDetails = createAsyncThunk('orders/fetchDetails', async (orderId: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await getOrderDetails(orderId, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const addNewOrder = createAsyncThunk('orders/addNew', async (orderData: NewOrderPayload, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) return rejectWithValue('No se encontró el token');
  try { return await createOrder(orderData, token); }
  catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const changeOrderStatus = createAsyncThunk('orders/changeStatus', async ({ orderId, status }: { orderId: string, status: string }, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await updateOrderStatus(orderId, status, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const cancelOrderAsAdmin = createAsyncThunk('orders/cancelAsAdmin', async (orderId: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await manageOrderAsAdmin(orderId, { status: 'cancelado' }, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    orderAdded: (state, action: PayloadAction<Order>) => {
      if (!state.activeOrders.find(order => order.id === action.payload.id)) {
        state.activeOrders.unshift(action.payload);
      }
    },
    orderUpdated: (state, action: PayloadAction<Order>) => {
        const index = state.activeOrders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
            state.activeOrders[index] = action.payload;
        }
        const myIndex = state.myOrders.findIndex(order => order.id === action.payload.id);
        if (myIndex !== -1) {
            state.myOrders[myIndex] = action.payload;
        }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveOrders.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchActiveOrders.fulfilled, (state, action: PayloadAction<Order[]>) => {
        state.status = 'succeeded';
        state.activeOrders = action.payload || [];
      })
      .addCase(fetchMyOrders.pending, (state) => { state.myOrdersStatus = 'loading'; })
      .addCase(fetchMyOrders.fulfilled, (state, action: PayloadAction<Order[]>) => {
        state.myOrdersStatus = 'succeeded';
        state.myOrders = action.payload || [];
      })
      .addCase(fetchOrderDetails.pending, (state) => { state.detailsStatus = 'loading'; })
      .addCase(fetchOrderDetails.fulfilled, (state, action: PayloadAction<Order>) => {
        state.detailsStatus = 'succeeded';
        state.selectedOrderDetails = action.payload;
      })
      .addCase(changeOrderStatus.fulfilled, (state, action: PayloadAction<Order>) => {
        const index = state.activeOrders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.activeOrders[index] = action.payload;
        }
      })
      .addCase(cancelOrderAsAdmin.fulfilled, (state, action: PayloadAction<Order>) => {
        const index = state.activeOrders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.activeOrders[index] = action.payload;
        }
      })
      .addCase(addNewOrder.fulfilled, (state, action: PayloadAction<Order>) => {
        state.myOrders.unshift(action.payload);
      });
  },
});

export const { orderAdded, orderUpdated } = ordersSlice.actions;
export default ordersSlice.reducer;