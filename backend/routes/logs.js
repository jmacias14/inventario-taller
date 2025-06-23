// logs.js
import express from 'express'
import prisma from '../db.js';

const router = express.Router()

// Obtener historial de movimientos con paginación y filtro por fechas
router.get('/', async (req, res) => {
  // Parámetros de paginación
  const page      = parseInt(req.query.page, 10)  || 1
  const limit     = parseInt(req.query.limit, 10) || 50
  const skip      = (page - 1) * limit

  // Parámetros de filtro por fecha (ISO yyyy-mm-dd)
  const { startDate, endDate } = req.query
  const whereFiltro = {}

  if (startDate) {
    whereFiltro.fecha = { gte: new Date(startDate) }
  }
  if (endDate) {
    whereFiltro.fecha = whereFiltro.fecha
      ? { ...whereFiltro.fecha, lte: new Date(endDate) }
      : { lte: new Date(endDate) }
  }

  try {
    // Obtener datos y conteo total en paralelo, aplicando whereFiltro
    const [logs, totalCount] = await Promise.all([
      prisma.movimiento.findMany({
        where: whereFiltro,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          producto: {
            include: {
              repisa: true,
              estante: true
            }
          }
        }
      }),
      prisma.movimiento.count({ where: whereFiltro })
    ])

    // Formatear salida
    const formateado = logs.map(log => ({
      id: log.id,
      tipo: log.tipo,
      cantidad: log.cantidad,
      fecha: log.fecha,
      observaciones: log.observaciones,
      producto: {
        id: log.producto.id,
        sku: log.producto.sku,
        descripcion: log.producto.descripcion,
        unidad: log.producto.unidad,
        marca: log.producto.marca,
        repisa: log.producto.repisa,
        estante: log.producto.estante,
        ubicacionLibre: log.producto.ubicacionLibre
      }
    }))

    const totalPages = Math.ceil(totalCount / limit)

    // Devolver datos con metadatos de paginación y filtrado
    res.json({
      data: formateado,
      page,
      limit,
      totalCount,
      totalPages
    })
  } catch (err) {
    console.error('[ERROR - GET /logs]', err)
    res.status(500).json({ error: 'Error al obtener registros de movimientos' })
  }
})

export default router