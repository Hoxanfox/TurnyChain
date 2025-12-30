// =================================================================
// ARCHIVO: /src/types/kitchen_tickets.ts
// Tipos para el sistema de tickets de cocina
// =================================================================

export interface KitchenTicketItem {
  menu_item_name: string;
  quantity: number;
  notes?: string;
  customizations?: {
    active_ingredients?: Array<{ name: string }>;
    selected_accompaniments?: Array<{ name: string }>;
  };
  is_takeout: boolean;
}

export interface KitchenTicket {
  order_id: string;
  order_number: string;
  table_number?: number;
  waiter_name: string;
  station_id: string;
  station_name: string;
  items: KitchenTicketItem[];
  created_at: string;
  order_type: string;
  special_notes?: string;
}

export interface KitchenTicketsPreview {
  order_id: string;
  tickets: KitchenTicket[];
}

export interface PrintKitchenTicketsRequest {
  order_id: string;
  reprint?: boolean;
}

export interface PrintKitchenTicketsResponse {
  success: boolean;
  message: string;
  tickets_sent: number;
  failed_prints: Array<{
    station_name: string;
    printer_name: string;
    error: string;
  }>;
  tickets: KitchenTicket[];
}

