// =================================================================
// ARCHIVO 1: /src/types/users.ts (ACTUALIZADO)
// Propósito: Corregir el tipo UpdateUser para que acepte el rol 'admin'.
// =================================================================
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'cajero' | 'mesero';
}

export interface NewUser {
  username: string;
  password: string;
  role: 'cajero' | 'mesero';
}

export interface UpdateUser {
  id: string;
  username?: string;
  // CORRECCIÓN: El rol a actualizar puede ser cualquiera de los roles existentes.
  role?: 'admin' | 'cajero' | 'mesero';
}