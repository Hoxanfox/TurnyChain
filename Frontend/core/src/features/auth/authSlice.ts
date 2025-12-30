// =================================================================
// ARCHIVO: /src/features/auth/authSlice.ts (CORREGIDO)
// Propósito: Solucionar el problema de la sesión persistente.
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import { loginUser } from './authAPI';
import type { LoginCredentials, User } from '../../types/auth'; // Asumiendo que /src/types/auth.ts existe

// --- Interfaces y Tipos ---
interface DecodedToken {
  sub: string; // ID del usuario
  role: 'admin' | 'cajero' | 'mesero';
  exp: number; // Timestamp de expiración
  // El backend también debería incluir el username en el token para una mejor experiencia
  username?: string; 
}

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// --- Lógica para el Estado Inicial ---

// 1. Intentamos obtener el token del localStorage.
const token = localStorage.getItem('token');
let user: User | null = null;

// 2. Si existe un token, lo decodificamos para restaurar la sesión.
if (token) {
  try {
    const decodedToken: DecodedToken = jwtDecode(token);
    // Verificamos si el token ha expirado
    if (decodedToken.exp * 1000 > Date.now()) {
      user = {
        id: decodedToken.sub,
        role: decodedToken.role,
        // Si el backend no incluye el username en el token, lo dejamos en blanco.
        // Lo ideal es que el backend lo incluya para no tener que pedirlo de nuevo.
        username: decodedToken.username || 'Usuario', 
      };
    } else {
      // Si el token ha expirado, lo eliminamos.
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    localStorage.removeItem('token');
  }
}

// 3. Usamos el token y el usuario (si se pudo restaurar) para el estado inicial.
const initialState: AuthState = {
  user: user,
  token: token,
  status: 'idle',
  error: null,
};


// --- Thunk Asíncrono para el Login ---
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const data = await loginUser(credentials);
      const decodedToken: DecodedToken = jwtDecode(data.token);
      const loggedInUser: User = {
        id: decodedToken.sub,
        username: decodedToken.username || credentials.username, // Usamos el username del token si existe
        role: decodedToken.role,
      };
      
      // ✅ Guardar datos necesarios para WebSocket
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', decodedToken.sub);
      localStorage.setItem('user_role', decodedToken.role);
      localStorage.setItem('username', loggedInUser.username);

      console.log('✅ Login exitoso:', {
        user_id: decodedToken.sub,
        role: decodedToken.role,
        username: loggedInUser.username
      });

      return { token: data.token, user: loggedInUser };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Login fallido');
    }
  }
);

// --- Creación del Slice ---
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Reducer para cerrar sesión
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_role');
      localStorage.removeItem('username');
      console.log('👋 Logout exitoso');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;