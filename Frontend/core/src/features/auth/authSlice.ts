// =================================================================
// ARCHIVO: /src/features/auth/authSlice.ts (CORREGIDO)
// Propósito: Solucionar el problema de la sesión persistente.
// =================================================================
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import { loginUser } from './authAPI';
import type { LoginCredentials, User, UserRole } from '../../types/auth'; // Asumiendo que /src/types/auth.ts existe

// --- Interfaces y Tipos ---
interface DecodedToken {
  sub: string; // ID del usuario
  role: UserRole;
  roles?: UserRole[];
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

const DEFAULT_SESSION_DURATION_DAYS = 30;
const envSessionDurationDays = Number(import.meta.env.VITE_SESSION_DURATION_DAYS);
const SESSION_DURATION_DAYS =
  Number.isFinite(envSessionDurationDays) && envSessionDurationDays > 0
    ? envSessionDurationDays
    : DEFAULT_SESSION_DURATION_DAYS;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_roles');
  localStorage.removeItem('username');
  localStorage.removeItem('session_expires_at');
};

// --- Lógica para el Estado Inicial ---

// 1. Intentamos obtener el token del localStorage.
let token = localStorage.getItem('token');
let user: User | null = null;
const sessionExpiresAtRaw = localStorage.getItem('session_expires_at');
const sessionExpiresAt = Number(sessionExpiresAtRaw || '0');
const hasValidLocalSession = !sessionExpiresAtRaw || sessionExpiresAt > Date.now();

// 2. Si existe un token, lo decodificamos para restaurar la sesión.
if (token) {
  try {
    const decodedToken: DecodedToken = jwtDecode(token);
    // Verificamos si el token ha expirado
    if (decodedToken.exp * 1000 > Date.now() && hasValidLocalSession) {
      const availableRoles = decodedToken.roles || [decodedToken.role];
      const storedRole = localStorage.getItem('user_role') as UserRole | null;
      user = {
        id: decodedToken.sub,
        role: storedRole && availableRoles.includes(storedRole) ? storedRole : decodedToken.role,
        roles: availableRoles,
        username: decodedToken.username || localStorage.getItem('username') || 'Usuario',
      };
      localStorage.setItem('session_expires_at', String(Date.now() + SESSION_DURATION_MS));
    } else {
      // Si expiró la sesión local o el token, limpiamos datos de auth.
      clearAuthStorage();
      token = null;
    }
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    clearAuthStorage();
    token = null;
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
        roles: decodedToken.roles || [decodedToken.role],
      };
      
      // ✅ Guardar datos necesarios para WebSocket
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', decodedToken.sub);
      localStorage.setItem('user_role', decodedToken.role);
      localStorage.setItem('user_roles', JSON.stringify(decodedToken.roles || [decodedToken.role]));
      localStorage.setItem('username', loggedInUser.username);
      localStorage.setItem('session_expires_at', String(Date.now() + SESSION_DURATION_MS));

      console.log('✅ Login exitoso:', {
        user_id: decodedToken.sub,
        role: decodedToken.role,
        roles: decodedToken.roles || [decodedToken.role],
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
      localStorage.clear();
      console.log('👋 Logout exitoso');
    },
    // Actualizar nombre de usuario localmente tras edición de perfil
    updateUsername: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.username = action.payload;
        localStorage.setItem('username', action.payload);
      }
    },
    setActiveRole: (state, action: PayloadAction<UserRole>) => {
      if (state.user && state.user.roles.includes(action.payload)) {
        state.user.role = action.payload;
        localStorage.setItem('user_role', action.payload);
      }
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

export const { logout, updateUsername, setActiveRole } = authSlice.actions;
export default authSlice.reducer;