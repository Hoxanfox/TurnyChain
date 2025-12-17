// =================================================================
// ARCHIVO: /src/features/waiter/waiterUtils.ts
// Funciones comunes especializadas para el feature de waiter
// =================================================================
import type { CartItem, MenuItem } from '../../../types/menu.ts';
import type { OrderItemPayload } from '../../../types/orders.ts';
import type { Table } from '../../../types/tables.ts';
import type { Accompaniment } from '../../../types/accompaniments.ts';
import type { Ingredient } from '../../../types/ingredients.ts';

/**
 * Interfaz para los datos de personalización que vienen del modal
 */
export interface CustomizationData {
  price: number;
  finalPrice: number;
  selectedAccompaniments: Accompaniment[];
  removedIngredients: Ingredient[];
  notes: string;
}

/**
 * Crea un nuevo CartItem a partir de un MenuItem y sus datos de personalización
 */
export const createCartItemFromCustomization = (
  item: MenuItem,
  customizationData: CustomizationData
): CartItem => {
  return {
    ...item,
    ...customizationData,
    cartItemId: `${item.id}-${Date.now()}`,
  };
};

/**
 * Elimina un item del carrito por su cartItemId
 */
export const removeItemFromCart = (
  cart: CartItem[],
  cartItemId: string
): CartItem[] => {
  return cart.filter(ci => ci.cartItemId !== cartItemId);
};

/**
 * Actualiza el precio de un item específico en el carrito
 */
export const updateCartItemPrice = (
  cart: CartItem[],
  cartItemId: string,
  newPrice: number
): CartItem[] => {
  return cart.map(item =>
    item.cartItemId === cartItemId
      ? { ...item, finalPrice: newPrice }
      : item
  );
};

/**
 * Construye el payload para enviar una orden al backend
 * NUEVO FORMATO: Envía solo los IDs de lo que NO quiere el cliente
 */
export const buildOrderPayload = (
  cart: CartItem[],
  tableId: string,
  tables: Table[]
) => {
  const selectedTable = tables.find(t => t.id === tableId);
  if (!selectedTable) return null;

  const orderItems: OrderItemPayload[] = cart.map(item => {
    // Calcular los IDs de ingredientes que NO quiere (removidos)
    const removedIngredientIds = item.removedIngredients.map(ing => ing.id);

    // Calcular los IDs de acompañantes que NO quiere
    // IMPORTANTE: Todos los acompañantes originales MENOS los seleccionados
    const allAccompanimentIds = (item.accompaniments || []).map(acc => acc.id);
    const selectedAccompanimentIds = item.selectedAccompaniments.map(acc => acc.id);
    const unselectedAccompanimentIds = allAccompanimentIds.filter(
      id => !selectedAccompanimentIds.includes(id)
    );

    return {
      menu_item_id: item.id,
      quantity: 1,
      price_at_order: item.finalPrice,
      notes: item.notes,
      customizations_input: {
        removed_ingredient_ids: removedIngredientIds,
        unselected_accompaniment_ids: unselectedAccompanimentIds,
      },
    };
  });

  return {
    table_id: tableId,
    table_number: selectedTable.table_number,
    items: orderItems
  };
};

/**
 * Valida si se puede enviar una orden (carrito no vacío y mesa seleccionada)
 */
export const canSendOrder = (cart: CartItem[], tableId: string): boolean => {
  return tableId !== '' && cart.length > 0;
};

/**
 * Calcula el total del carrito
 */
export const calculateCartTotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => total + item.finalPrice, 0);
};

/**
 * Encuentra una mesa por su ID
 */
export const findTableById = (tables: Table[], tableId: string): Table | undefined => {
  return tables.find(t => t.id === tableId);
};

