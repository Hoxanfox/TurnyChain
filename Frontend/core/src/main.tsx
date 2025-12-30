// =================================================================
// ARCHIVO 7: /src/main.tsx
// Propósito: Envolver la aplicación con el Provider de Redux.
// =================================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import App from './App.tsx'
import './index.css'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)