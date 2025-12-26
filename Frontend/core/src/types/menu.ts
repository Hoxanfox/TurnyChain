// =================================================================
// ARCHIVO 1: /src/types/menu.ts (ACTUALIZADO)
// =================================================================
import type { Ingredient } from './ingredients';
import type { Accompaniment } from './accompaniments';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  category_name?: string; // Nombre de la categoría para display
  is_available: boolean;
  is_active?: boolean;
  image_url?: string;
  ingredients: Ingredient[];
  accompaniments: Accompaniment[];
  order_count?: number; // Contador de veces que se ha pedido (para popularidad)
}

// Nuevo tipo para los ítems en el carrito, que pueden tener personalizaciones
export interface CartItem extends MenuItem {
    cartItemId: string; // ID único para este ítem en el carrito
    quantity: number; // Cantidad de este ítem
    finalPrice: number;
    selectedAccompaniments: Accompaniment[];
    removedIngredients: Ingredient[];
    notes?: string;
    is_takeout?: boolean; // Nuevo: indica si el item es para llevar
}