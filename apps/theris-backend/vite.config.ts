import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __VITE_API_URL__: JSON.stringify(process.env.VITE_API_URL ?? ''),
    __VITE_AUTH_MODE__: JSON.stringify(process.env.VITE_AUTH_MODE ?? 'legacy'),
  },
  build: {
    outDir: 'dist/client', // Frontend separado do backend (backend em dist/)
  }
})