// Ubicación: /Frontend/core/vite.config.ts (ACTUALIZADO)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- ¡AÑADIR ESTA SECCIÓN! ---
  server: {
    // Esto le dice a Vite que escuche en todas las interfaces de red,
    // no solo en localhost.
    host: true, 
  }
})
