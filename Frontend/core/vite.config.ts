import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite conexiones desde la red (IP 192.168.x.x)
    port: 3000, // Fijamos el puerto para no perdernos
  }
})