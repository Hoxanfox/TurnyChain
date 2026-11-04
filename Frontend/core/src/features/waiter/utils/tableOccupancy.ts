import type { Order } from '../../../types/orders';

export type TableOccupancyStatus = 'available' | 'to_collect' | 'verification';

export const getTableOccupancyStatus = (orders: Order[], tableNumber: number): TableOccupancyStatus => {
  const tableOrders = orders.filter((order) => order.table_number === tableNumber);
  if (tableOrders.some((order) => order.status === 'entregado' || order.status === 'pendiente_aprobacion')) {
    return 'to_collect';
  }
  if (tableOrders.some((order) => order.status === 'por_verificar')) {
    return 'verification';
  }
  return 'available';
};

