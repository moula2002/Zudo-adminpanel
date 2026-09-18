import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://snbtradingco.in',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://snbtradingco.in',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
