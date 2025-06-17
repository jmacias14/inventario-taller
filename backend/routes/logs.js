import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Obtener historial de movimientos
router.get('/', async (req, res) => {
  try {
    const logs = await prisma.movimiento.findMany({
      include: {
        producto: true
      },
      orderBy: {
        fecha: 'desc'  // Cambiado de timestamp a fecha
      }
    })

    const formateado = logs.map(log => ({
      id: log.id,
      tipo: log.tipo,
      cantidad: log.cantidad,
      fecha: log.fecha,   // Cambiado de timestamp a fecha
      descripcion: log.producto.descripcion,
      marca: log.producto.marca,
      unidad: log.producto.unidad
    }))

    res.json(formateado)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener registros' })
  }
})

// Deshacer un movimiento y revertir el stock
router.post('/undo/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const movimiento = await prisma.movimiento.findFirst({
      where: { id },
      include: { producto: true }
    })

    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' })
    }

    const ajusteStock = movimiento.tipo === 'ingreso'
      ? { cantidad: { decrement: movimiento.cantidad } }
      : { cantidad: { increment: movimiento.cantidad } }

    await prisma.$transaction([
      prisma.producto.update({
        where: { id: movimiento.productoId },
        data: ajusteStock
      }),
      prisma.movimiento.create({
        data: {
          tipo: 'anulado',
          productoId: movimiento.productoId,
          cantidad: movimiento.cantidad
        }
      }),
      prisma.movimiento.delete({
        where: { id: movimiento.id }
      })
    ])

    res.json({ message: 'Movimiento deshecho, registrado como anulado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al deshacer movimiento' })
  }
})

export default router
