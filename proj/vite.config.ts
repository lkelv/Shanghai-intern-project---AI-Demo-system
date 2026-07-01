import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // The backend writes leads.json into this folder; don't let that trigger a
    // full-page reload that would wipe the chat mid-conversation.
    watch: { ignored: ['**/leads.json'] },
    proxy: {
      // Forward API calls to the local backend so the OpenRouter key stays
      // server-side and the browser talks to a same-origin /api path.
      '/api': 'http://localhost:8791',
    },
  },
})
