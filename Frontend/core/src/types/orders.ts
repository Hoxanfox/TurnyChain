// =================================================================
// ARCHIVO 1: /src/types/orders.ts (ACTUALIZADO)
// =================================================================
export interface OrderItem {
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  notes?: string;
}

export interface Order {
  id: string;
  waiter_id: string;
  table_number: number;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[]; // Ahora esperamos que los items siempre vengan en el detalle
}

export interface NewOrderPayload {
  table_number: number;
  items: OrderItem[];
}