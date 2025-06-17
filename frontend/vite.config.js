import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 5173
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      // Agregá tu dominio o IP si hace falta
      'rolling-twelve-purchased-labeled.trycloudflare.com'
    ],
    https: {
      key: fs.readFileSync('/app/certs/dev-key.pem'),
      cert: fs.readFileSync('/app/certs/dev-cert.pem')
    }
  }
})
