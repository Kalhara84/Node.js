// Configure the Vite development and preview servers.
import { defineConfig } from 'vite'

// Port 3000 = the same address the backend allows in FRONTEND_URL (CORS)
export default defineConfig({
  // Run development on port 3000; fail instead of silently switching ports.
  server: { port: 3000, strictPort: true },
  // Use the same fixed port when previewing the production build.
  preview: { port: 3000, strictPort: true },
})
