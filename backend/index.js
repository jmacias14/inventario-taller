import express from 'express'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url'

// Ruta absoluta del directorio actual (por ES Modules)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// === Certificados SSL (montados desde /app/certs por Docker) ===
const certPath = '/app/certs/dev-cert.pem'
const keyPath = '/app/certs/dev-key.pem'
const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
}

import productRoutes from './routes/products.js'
import ventasRoutes from './routes/sales.js'
import logRoutes from './routes/logs.js'
import configRoutes from './routes/config.js'
import estructuraRoutes from './routes/estructura.js'
import importarRoutes from './routes/importar.js'

const app = express()

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}))

app.use(express.json())

app.use('/products', productRoutes)
app.use('/ventas', ventasRoutes)
app.use('/logs', logRoutes)
app.use('/config', configRoutes)
app.use('/estructura', estructuraRoutes)
app.use('/importar', importarRoutes)

// HTTPS listener
const PORT = 3001
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API escuchando con HTTPS en https://0.0.0.0:${PORT}`)
})
