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
  is_available: boolean;
  ingredients: Ingredient[];
  accompaniments: Accompaniment[];
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