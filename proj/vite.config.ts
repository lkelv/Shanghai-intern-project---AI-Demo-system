import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Forward API calls to the local backend so the OpenRouter key stays
      // server-side and the browser talks to a same-origin /api path.
      '/api': 'http://localhost:8791',
    },
  },
})
