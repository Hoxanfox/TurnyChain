// =================================================================
// ARCHIVO 3: /src/features/orders/ordersSlice.ts
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { createOrder, getOrders, getOrderDetails, updateOrderStatus, manageOrderAsAdmin, editOrder } from './ordersAPI.ts';
import type { Order, NewOrderPayload, EditOrderRequest } from '../../../../types/orders.ts';
import type { RootState } from '../../../../app/store.ts';

interface OrdersState {
  activeOrders: Order[];
  myOrders: Order[];
  selectedOrderDetails: Order | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  myOrdersStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  createOrderStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  detailsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: OrdersState = {
  activeOrders: [],
  myOrders: [],
  selectedOrderDetails: null,
  status: 'idle',
  myOrdersStatus: 'idle',
  createOrderStatus: 'idle',
  detailsStatus: 'idle',
  error: null,
};

export const fetchActiveOrders = createAsyncThunk('orders/fetchActive', async (options: { teamOrders?: boolean } | undefined, { getState, rejectWithValue }) => {
  const token = (getState() as RootState).auth.token;
  if (!token) {
    console.error('❌ [fetchActiveOrders] No se encontró el token');
    return rejectWithValue('No se encontró el token');
  }
  try { 
    console.log('🔄 [fetchActiveOrders] Solicitando órdenes activas...');
    const orders = await getOrders(token, undefined, false, options?.teamOrders === true);
    console.log('✅ [fetchActiveOrders] Órdenes recibidas:', orders?.length || 0, 'órdenes');
    console.log('📦 [fetchActiveOrders] Primera orden (muestra):', orders?.[0]);
    return orders;
  }
  catch (error: any) { 
    console.error('❌ [fetchActiveOrders] Error:', error);
    console.error('📋 [fetchActiveOrders] Detalles del error:', error.response?.data);
    return rejectWithValue(error.response?.data?.error || error.message || 'Error desconocido'); 
  }
});

export const fetchMyOrders = createAsyncThunk('orders/fetchMyOrders', async (_, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) {
      console.error('❌ [fetchMyOrders] No se encontró el token');
      return rejectWithValue('No se encontró el token');
    }
    try { 
      console.log('🔄 [fetchMyOrders] Solicitando mis órdenes...');
      const orders = await getOrders(token, undefined, true); // Agregado true para filtrar por mesero
      console.log('✅ [fetchMyOrders] Órdenes recibidas:', orders?.length || 0, 'órdenes');
      console.log('📦 [fetchMyOrders] Primera orden (muestra):', orders?.[0]);
      return orders;
    }
    catch (error: any) { 
      console.error('❌ [fetchMyOrders] Error:', error);
      console.error('📋 [fetchMyOrders] Detalles del error:', error.response?.data);
      return rejectWithValue(error.response?.data?.error || error.message || 'Error desconocido'); 
    }
});

export const fetchOrderDetails = createAsyncThunk('orders/fetchDetails', async (orderId: string, { getState, rejectWithValue }) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try { return await getOrderDetails(orderId, token); }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
});

export const addNewOrder = createAsyncThunk(
  'orders/addNew',
  async (
    payload: {
      orderData: NewOrderPayload;
      paymentMethod?: string;
      paymentProofFile?: File | null;
      requestId?: string;
    },
    { getState, rejectWithValue }
  ) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try {
      return await createOrder(
        payload.orderData,
        token,
        payload.paymentMethod,
        payload.paymentProofFile,
        payload.requestId
      );
    }
    catch (error: any) { return rejectWithValue(error.response?.data?.error); }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      return state.orders.createOrderStatus !== 'loading';
    }
  }
);

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

export const updateOrder = createAsyncThunk(
  'orders/edit',
  async (
    { orderId, editRequest }: { orderId: string; editRequest: EditOrderRequest },
    { getState, rejectWithValue }
  ) => {
    const token = (getState() as RootState).auth.token;
    if (!token) return rejectWithValue('No se encontró el token');
    try {
      return await editOrder(orderId, editRequest, token);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Error al editar la orden');
    }
  }
);

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    orderAdded: (state, action: PayloadAction<Order>) => {
      if (!state.activeOrders.find((order: Order) => order.id === action.payload.id)) {
        state.activeOrders.unshift(action.payload);
      }
    },
    orderUpdated: (state, action: PayloadAction<Order>) => {
        const updatedOrder = action.payload;

        // 🛡️ Actualizar en activeOrders
        const index = state.activeOrders.findIndex((order: Order) => order.id === updatedOrder.id);
        if (index !== -1) {
            // Preservar items existentes si el payload no trae items
            const existingItems = state.activeOrders[index].items;
            state.activeOrders[index] = {
                ...updatedOrder,
                items: updatedOrder.items || existingItems || []
            };
        }

        // 🛡️ Actualizar en myOrders
        const myIndex = state.myOrders.findIndex((order: Order) => order.id === updatedOrder.id);
        if (myIndex !== -1) {
            // Preservar items existentes si el payload no trae items
            const existingItems = state.myOrders[myIndex].items;
            state.myOrders[myIndex] = {
                ...updatedOrder,
                items: updatedOrder.items || existingItems || []
            };
        }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveOrders.pending, (state) => { 
        console.log('⏳ [Reducer] fetchActiveOrders - PENDING');
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchActiveOrders.fulfilled, (state, action: PayloadAction<Order[]>) => {
        console.log('✅ [Reducer] fetchActiveOrders - FULFILLED con', action.payload?.length || 0, 'órdenes');
        console.log('📦 [Reducer] Payload completo:', action.payload);
        state.status = 'succeeded';
        state.activeOrders = action.payload || [];
        state.error = null;
      })
      .addCase(fetchActiveOrders.rejected, (state, action) => {
        console.error('❌ [Reducer] fetchActiveOrders - REJECTED:', action.payload);
        state.status = 'failed';
        state.error = action.payload as string || 'Error al cargar órdenes activas';
      })
      .addCase(fetchMyOrders.pending, (state) => { 
        console.log('⏳ [Reducer] fetchMyOrders - PENDING');
        state.myOrdersStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action: PayloadAction<Order[]>) => {
        console.log('✅ [Reducer] fetchMyOrders - FULFILLED con', action.payload?.length || 0, 'órdenes');
        console.log('📦 [Reducer] Payload completo:', action.payload);
        state.myOrdersStatus = 'succeeded';
        state.myOrders = action.payload || [];
        state.error = null;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        console.error('❌ [Reducer] fetchMyOrders - REJECTED:', action.payload);
        state.myOrdersStatus = 'failed';
        state.error = action.payload as string || 'Error al cargar mis órdenes';
      })
      .addCase(fetchOrderDetails.pending, (state) => { 
        state.detailsStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action: PayloadAction<Order>) => {
        state.detailsStatus = 'succeeded';
        state.selectedOrderDetails = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.detailsStatus = 'failed';
        state.error = action.payload as string || 'Error al cargar detalles de orden';
      })
      .addCase(changeOrderStatus.fulfilled, (state, action: PayloadAction<Order>) => {
        const index = state.activeOrders.findIndex((order: Order) => order.id === action.payload.id);
        if (index !== -1) {
          state.activeOrders[index] = action.payload;
        }
      })
      .addCase(cancelOrderAsAdmin.fulfilled, (state, action: PayloadAction<Order>) => {
        const index = state.activeOrders.findIndex((order: Order) => order.id === action.payload.id);
        if (index !== -1) {
          state.activeOrders[index] = action.payload;
        }
      })
      .addCase(addNewOrder.pending, (state) => {
        state.createOrderStatus = 'loading';
      })
      .addCase(addNewOrder.fulfilled, (state, action: PayloadAction<Order>) => {
        state.createOrderStatus = 'succeeded';
        if (!state.myOrders.find((order: Order) => order.id === action.payload.id)) {
          state.myOrders.unshift(action.payload);
        }
      })
      .addCase(addNewOrder.rejected, (state, action) => {
        state.createOrderStatus = 'failed';
        state.error = (action.payload as string) || 'Error al crear la orden';
      })
      .addCase(updateOrder.fulfilled, (state, action: PayloadAction<Order>) => {
        // Actualizar en myOrders
        const myIndex = state.myOrders.findIndex((order: Order) => order.id === action.payload.id);
        if (myIndex !== -1) {
          state.myOrders[myIndex] = action.payload;
        }
        // Actualizar en activeOrders
        const activeIndex = state.activeOrders.findIndex((order: Order) => order.id === action.payload.id);
        if (activeIndex !== -1) {
          state.activeOrders[activeIndex] = action.payload;
        }
        // Actualizar selectedOrderDetails si es la misma orden
        if (state.selectedOrderDetails?.id === action.payload.id) {
          state.selectedOrderDetails = action.payload;
        }
      });
  },
});

export const { orderAdded, orderUpdated } = ordersSlice.actions;
export default ordersSlice.reducer;