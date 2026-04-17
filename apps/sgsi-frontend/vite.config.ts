import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: import.meta.env?.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
