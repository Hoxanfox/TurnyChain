// =================================================================
// ARCHIVO 2: /src/features/orders/ordersAPI.ts
// =================================================================
import axios from 'axios';
import type { Order, NewOrderPayload, EditOrderRequest } from '../../../../types/orders.ts';

// Usamos rutas relativas. En desarrollo, Vite proxy redirige a localhost:8080
// En producción, nginx redirige al backend
const API_URL = '/api/orders';

export const createOrder = async (
  orderData: NewOrderPayload,
  token: string,
  paymentMethod?: string,
  paymentProofFile?: File | null,
  requestId?: string
): Promise<Order> => {
  // Si hay datos de pago, usar FormData y el endpoint /with-payment
  if (paymentMethod) {
    console.log('🔄 Creando orden con pago:', {
      paymentMethod,
      hasProofFile: !!paymentProofFile,
      endpoint: `${API_URL}/with-payment`
    });

    const formData = new FormData();
    formData.append('order_data', JSON.stringify(orderData));
    formData.append('payment_method', paymentMethod);

    if (paymentProofFile) {
      formData.append('payment_proof', paymentProofFile);
      console.log('📎 Archivo adjunto:', {
        name: paymentProofFile.name,
        size: paymentProofFile.size,
        type: paymentProofFile.type
      });
    }

    // ⚠️ CRÍTICO: NO establecer Content-Type manualmente cuando usas FormData
    // El navegador lo establece automáticamente con el boundary correcto
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(requestId ? { 'X-Request-ID': requestId } : {}),
        // NO incluir 'Content-Type' aquí - el navegador lo maneja automáticamente
      }
    };

    const response = await axios.post(`${API_URL}/with-payment`, formData, config);
    console.log('✅ Orden creada exitosamente:', response.data);
    return response.data;
  }

  // Si no hay datos de pago, enviar normal
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(requestId ? { 'X-Request-ID': requestId } : {}),
      'Content-Type': 'application/json'
    }
  };

  const response = await axios.post(API_URL, orderData, config);
  return response.data;
};

export const getOrders = async (token: string, status?: string, filterByWaiter?: boolean, teamOrders?: boolean): Promise<Order[]> => {
  console.log('🌐 [API] getOrders llamado con:', { status, filterByWaiter, teamOrders });
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      status,
      my_orders: filterByWaiter ? 'true' : undefined,
      team_orders: teamOrders ? 'true' : undefined
    }
  };
  console.log('📤 [API] Haciendo petición GET a:', API_URL, 'con params:', config.params);
  try {
    const response = await axios.get(API_URL, config);
    console.log('📥 [API] Respuesta recibida:', {
      status: response.status,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : 'N/A',
      firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ [API] Error en getOrders:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    throw error;
  }
};

export const getTodayOrders = async (token: string, status?: string, filterByWaiter?: boolean, teamOrders?: boolean): Promise<Order[]> => {
  console.log('🌐 [API] getTodayOrders llamado con:', { status, filterByWaiter, teamOrders });
  const config = {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      status,
      my_orders: filterByWaiter ? 'true' : undefined,
      team_orders: teamOrders ? 'true' : undefined
    }
  };
  console.log('📤 [API] Haciendo petición GET a:', `${API_URL}/today`, 'con params:', config.params);
  try {
    const response = await axios.get(`${API_URL}/today`, config);
    console.log('📥 [API] Respuesta recibida:', {
      status: response.status,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      count: Array.isArray(response.data) ? response.data.length : 'N/A',
      firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ [API] Error en getTodayOrders:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    throw error;
  }
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

export const uploadPaymentProof = async (orderId: string, file: File, method: string, token: string): Promise<Order> => {
  console.log('🔄 [Frontend] Enviando comprobante de pago:', {
    orderId,
    method,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('method', method);

  // ⚠️ CRÍTICO: NO establecer Content-Type manualmente con FormData
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      // El navegador establece automáticamente 'Content-Type: multipart/form-data; boundary=...'
    }
  };

  const response = await axios.post(`${API_URL}/${orderId}/proof`, formData, config);

  console.log('✅ [Frontend] Comprobante enviado exitosamente:', {
    orderId: response.data.id,
    status: response.data.status,
    payment_method: response.data.payment_method
  });

  return response.data;
};

// Editar orden de forma granular
export const editOrder = async (orderId: string, editRequest: EditOrderRequest, token: string): Promise<Order> => {
  console.log('✏️ [Frontend] Editando orden:', {
    orderId,
    editRequest
  });

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await axios.patch(`${API_URL}/${orderId}/edit`, editRequest, config);

  console.log('✅ [Frontend] Orden editada exitosamente:', {
    orderId: response.data.id,
    status: response.data.status,
    itemsCount: response.data.items?.length || 0,
    total: response.data.total
  });

  return response.data;
};
