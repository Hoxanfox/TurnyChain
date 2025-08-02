// =================================================================
// ARCHIVO 1: /src/types/menu.ts (NUEVO ARCHIVO)
// Propósito: Definir los tipos de TypeScript para el Menú.
// =================================================================
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}