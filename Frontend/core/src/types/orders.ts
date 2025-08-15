// =================================================================
// ARCHIVO 1: /src/types/orders.ts (ACTUALIZADO)
// =================================================================
import type { Ingredient } from './ingredients';
import type { Accompaniment } from './accompaniments';

export interface Customizations {
    removed_ingredients: Ingredient[];
    selected_accompaniments: Accompaniment[];
}

// Se actualiza para que coincida con la respuesta detallada del backend
export interface OrderItem {
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  price_at_order: number;
  notes?: string;
  customizations: Customizations;
}

export interface Order {
  id: string;
  waiter_id: string;
  table_number: number;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItemPayload {
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  notes?: string;
  customizations: Customizations;
}

export interface NewOrderPayload {
  table_id: string;
  table_number: number;
  items: OrderItemPayload[];
}