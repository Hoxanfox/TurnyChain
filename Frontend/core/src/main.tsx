// =================================================================
// ARCHIVO 7: /src/main.tsx
// Propósito: Envolver la aplicación con el Provider de Redux.
// =================================================================
import { scan } from 'react-scan'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import axios from 'axios'
import { store } from './app/store'
import { logout } from './features/auth/authSlice'
import App from './App.tsx'
import './index.css'

const reactScanEnabled = import.meta.env.VITE_REACT_SCAN !== 'false';

if (import.meta.env.DEV && reactScanEnabled) {
  scan({
    enabled: true,
    log: true,
  })
}

// ===================================================================
// FIX PARA 100VH EN MÓVILES - Calcula la altura real de la ventana
// ===================================================================
const setRealVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Ejecutar al cargar y al redimensionar
setRealVH();
window.addEventListener('resize', setRealVH);
window.addEventListener('orientationchange', setRealVH);

// Ejecutar también cuando la barra de navegación aparece/desaparece
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      setRealVH();
      ticking = false;
    });
    ticking = true;
  }
});
// ===================================================================

const redirectToLoginWithMessage = (message: string) => {
  if (sessionStorage.getItem('auth_redirecting')) {
    return;
  }
  sessionStorage.setItem('auth_redirecting', 'true');
  sessionStorage.setItem('auth_error', message);
  store.dispatch(logout());
  window.location.assign('/login');
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        redirectToLoginWithMessage('Sesion revocada. Inicia sesion nuevamente.');
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)