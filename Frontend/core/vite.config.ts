import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite conexiones desde la red (IP 192.168.x.x)
    port: 3000, // Fijamos el puerto para no perdernos
    proxy: {
      // Redirige todas las peticiones /api/* al backend Go
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Redirige las conexiones WebSocket
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      // Redirige las peticiones de archivos estáticos (imágenes de comprobantes)
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})