// =================================================================
// ARCHIVO 2: /src/features/orders/ordersAPI.ts
// =================================================================
import axios from 'axios';
import type { Order, NewOrderPayload } from '../../types/orders';

const API_URL = '/api/orders';

export const createOrder = async (orderData: NewOrderPayload, token: string): Promise<Order> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.post(API_URL, orderData, config);
  return response.data;
};

export const getOrders = async (token: string, status?: string): Promise<Order[]> => {
  const config = { 
    headers: { Authorization: `Bearer ${token}` },
    params: { status } 
  };
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const getOrderDetails = async (orderId: string, token: string): Promise<Order> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(`${API_URL}/${orderId}`, config);
  return response.data;
};

export const updateOrderStatus = async (orderId: string, status: string, token: string): Promise<Order> => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.put(`${API_URL}/${orderId}/status`, { status }, config);
  return response.data;
};

export const manageOrderAsAdmin = async (orderId: string, updates: { status?: string, waiter_id?: string }, token: string): Promise<Order> => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.put(`${API_URL}/${orderId}/manage`, updates, config);
    return response.data;
};