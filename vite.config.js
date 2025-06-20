import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
const apiUrl = import.meta.env.VITE_API_URL;
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
      },
      '/socket.io': {
        target: apiUrl,
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
