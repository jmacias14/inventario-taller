import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Registrar venta y descontar stock
router.post('/', async (req, res) => {
  const { comentarios, productos } = req.body

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un producto' })
  }

  try {
    const venta = await prisma.venta.create({
      data: {
        comentarios,
        items: {
          create: productos.map((p) => ({
            productoId: p.productoId,
            cantidad: p.cantidad
          }))
        }
      }
    })

    const updates = []
    const logs = []

    for (const p of productos) {
      // LOG DE DEBUG ANTES DEL UPDATE
      console.log('DEBUG PRISMA UPDATE (venta):', JSON.stringify({
        where: { id: p.productoId },
        data: { cantidad: { decrement: p.cantidad } }
      }, null, 2))
      updates.push(
        prisma.producto.update({
          where: { id: p.productoId },
          data: { cantidad: { decrement: p.cantidad } }
        })
      )
      logs.push(
        prisma.movimiento.create({
          data: {
            tipo: 'egreso',
            productoId: p.productoId,
            cantidad: p.cantidad,
            ventaId: venta.id
          }
        })
      )
    }

    await prisma.$transaction([...updates, ...logs])

    res.status(201).json({ mensaje: 'Venta registrada', ventaId: venta.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar venta' })
  }
})

// Obtener historial de ventas con todos los datos del producto
router.get('/history', async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            producto: {
              include: {
                repisa: true,
                estante: true
              }
            }
          }
        }
      }
    })

    const resultado = ventas.map((venta) => ({
      id: venta.id,
      fecha: venta.createdAt,
      comentarios: venta.comentarios,
      productos: venta.items.map((item) => ({
        id: item.producto.id,
        descripcion: item.producto.descripcion,
        sku: item.producto.sku,
        unidad: item.producto.unidad,
        cantidad: item.cantidad,
        marca: item.producto.marca,
        observaciones: item.producto.observaciones,
        tipoUbicacion: item.producto.tipoUbicacion,
        ubicacionLibre: item.producto.ubicacionLibre,
        repisa: item.producto.repisa,
        estante: item.producto.estante
      }))
    }))

    res.json(resultado)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener historial de ventas' })
  }
})

// Anular venta (eliminar y restaurar stock)
router.delete('/:id', async (req, res) => {
  const ventaId = parseInt(req.params.id)

  try {
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        items: true
      }
    })

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' })
    }

    const updates = venta.items.map(item => {
      // LOG DE DEBUG ANTES DEL UPDATE
      console.log('DEBUG PRISMA UPDATE (anular venta):', JSON.stringify({
        where: { id: item.productoId },
        data: { cantidad: { increment: item.cantidad } }
      }, null, 2))
      return prisma.producto.update({
        where: { id: item.productoId },
        data: { cantidad: { increment: item.cantidad } }
      })
    })

    await prisma.$transaction([
      ...updates,
      prisma.movimiento.deleteMany({ where: { ventaId } }),
      prisma.ventaItem.deleteMany({ where: { ventaId } }),
      prisma.venta.delete({ where: { id: ventaId } })
    ])

    res.json({ mensaje: 'Venta anulada, stock restaurado y movimientos eliminados' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al anular la venta' })
  }
})

export default router
