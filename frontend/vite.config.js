import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiProxyTarget = process.env.VITE_API_URL
  ? process.env.VITE_API_URL.replace(/\/api\/?$/, "")
  : 'http://localhost:5002';

// https://vite.dev/config/
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
