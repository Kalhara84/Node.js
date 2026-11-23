import { defineConfig } from 'vite'

// Port 3000 = the same address the backend allows in FRONTEND_URL (CORS)
export default defineConfig({
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
})
