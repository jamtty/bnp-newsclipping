import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'https://newsclipping.mycafe24.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api/, '/backend/api'),
      },
    },
  },
})
