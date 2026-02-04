import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'relucent-vida-hyperphysical.ngrok-free.dev',
      'localhost',
      '.ngrok-free.dev'
    ],
    proxy: {
      '/api': {
        target: 'https://reelio.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://reelio.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/gaming-hub': {
        target: 'https://reelio.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://reelio.onrender.com',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
