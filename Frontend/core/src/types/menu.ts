// =================================================================
// ARCHIVO 2: /src/types/menu.ts (ACTUALIZADO)
// =================================================================
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  modifiers: Record<string, string[]>;
}