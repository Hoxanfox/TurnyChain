// =================================================================
// ARCHIVO 1: /src/types/auth.ts
// Propósito: Definir los tipos de TypeScript para la autenticación.
// =================================================================
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'cajero' | 'mesero' | null;
}
