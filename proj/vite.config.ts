import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    port: 5173,
    strictPort: true,
    // The standalone Node backend writes journey.json into this folder; don't
    // let that trigger a full-page reload that would wipe the run mid-journey.
    watch: { ignored: ['**/journey.json'] },
    // No /api proxy: the Cloudflare plugin runs the Worker (server.worker.js) in
    // dev and serves /api directly (using .dev.vars + a local KV).
  },
})