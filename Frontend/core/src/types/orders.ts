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
  is_takeout?: boolean; // Nuevo: indica si el item es para llevar
}

// Nuevo: Interfaz de Pago para Pagos Divididos (Split Payments)
export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: string; // "transferencia" | "efectivo"
  payment_proof_path?: string; // Ruta de la imagen del comprobante
  created_at: string;
}

export interface EditHistoryEntry {
  timestamp: string;
  user_id: string;
  user_role: string;
  reason: string;
  changes: string;
}

// Orden completa que RECIBIMOS del backend
export interface Order {
  id: string;
  parent_order_id?: string;
  waiter_id: string;
  waiter_name?: string;
  table_number: number;
  status: string;
  total: number;
    created_at: string;
  items: OrderItem[];
  payment_method?: string; // "transferencia" | "efectivo" | "mixto"
  payment_proof_path?: string; // Ruta de la imagen del comprobante (legacy)
  payments?: Payment[]; // Arreglo de pagos múltiples (Split Payments)
  // Nuevo: Tipo de orden
  order_type?: string; // "mesa" | "llevar" | "domicilio"
  // Nuevo: Campos para domicilio
  delivery_address?: string;
  delivery_phone?: string;
  delivery_notes?: string;
  customer_name?: string; // Nuevo: nombre del cliente para llevar/domicilio
  print_status?: 'pending' | 'queued' | 'processing' | 'printing' | 'printed' | 'failed' | 'partial';
  print_attempts?: number;
  last_print_error?: string;
  printed_at?: string;
  last_print_attempt_at?: string;
  edit_history?: EditHistoryEntry[]; // Historial de ediciones
  blockchain_tx_hash?: string; // Hash de la transacción de blockchain
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
  is_takeout?: boolean; // Nuevo: indica si el item es para llevar
}

export interface NewOrderPayload {
  table_id: string;
  table_number: number;
  parent_order_id?: string;
  customer_name?: string;
  items: OrderItemPayload[];
  // Nuevo: Tipo de orden
  order_type?: string; // "mesa" | "llevar" | "domicilio"
  // Nuevo: Campos para domicilio
  delivery_address?: string;
  delivery_phone?: string;
  delivery_notes?: string;
}

export interface EditOrderItemUpdate {
  index: number;
  quantity?: number;
  price_at_order?: number;
  notes?: string;
  is_takeout?: boolean;
}

export interface EditOrderRequest {
  add_items?: OrderItemPayload[];
  update_items?: EditOrderItemUpdate[];
  remove_items?: number[];
  edit_reason?: string; // Razón de la edición
  override_payments?: Partial<Payment>[];
}