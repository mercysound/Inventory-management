import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In production the frontend is served by the same Express server so
// VITE_API_URL="/api" (relative). The dev proxy only applies locally.
// When VITE_API_URL is relative or absent, fall back to port 5008
// which matches PORT in server/.env.
const rawApiUrl = process.env.VITE_API_URL || "";
const apiProxyTarget = rawApiUrl.startsWith("http")
  ? rawApiUrl.replace(/\/api\/?$/, "")
  : "http://localhost:5008";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
