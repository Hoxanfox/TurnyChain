// =================================================================
// ARCHIVO: /src/types/orders.ts (ACTUALIZADO - NUEVO FORMATO BACKEND)
// =================================================================
import type { Ingredient } from './ingredients';
import type { Accompaniment } from './accompaniments';

// ============================================
// FORMATO NUEVO: Lo que el backend ESPERA al crear una orden
// ============================================
export interface CustomizationsInput {
  removed_ingredient_ids: string[];       // IDs de ingredientes que NO quiere
  unselected_accompaniment_ids: string[]; // IDs de acompañantes que NO quiere
}

// ============================================
// FORMATO NUEVO: Lo que el backend DEVUELVE
// ============================================
export interface Customizations {
  active_ingredients: Ingredient[];      // Ingredientes que SÍ lleva
  selected_accompaniments: Accompaniment[]; // Acompañantes que SÍ lleva
}

// OrderItem que RECIBIMOS del backend (GET /orders, GET /orders/:id)
export interface OrderItem {
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  price_at_order: number;
  notes?: string;
  customizations?: Customizations; // Puede ser null/undefined si no hay customizaciones
}

// Orden completa que RECIBIMOS del backend
export interface Order {
  id: string;
  waiter_id: string;
  waiter_name?: string;
  table_number: number;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
}

// ============================================
// PAYLOAD que ENVIAMOS al backend (POST /orders)
// ============================================
export interface OrderItemPayload {
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  notes?: string;
  customizations_input?: CustomizationsInput; // Nuevo formato
}

export interface NewOrderPayload {
  table_id: string;
  table_number: number;
  items: OrderItemPayload[];
}