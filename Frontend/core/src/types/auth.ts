// =================================================================
// ARCHIVO 1: /src/types/auth.ts
// Propósito: Definir los tipos de TypeScript para la autenticación.
// =================================================================
export interface LoginCredentials {
  username: string;
  password: string;
}

export type UserRole = 'admin' | 'gerente' | 'cajero' | 'mesero';

export interface User {
  id: string;
  username: string;
  role: UserRole | null;
  roles: UserRole[];
}
