import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Obtener productos con filtros y búsqueda avanzada
router.get('/', async (req, res) => {
  const {
    query = '', marca, unidad, minCantidad, maxCantidad,
    estante, repisa, skip = 0, take = 50,
    sortBy = 'id', order = 'desc'
  } = req.query

  const palabras = query.trim().toLowerCase().split(/\s+/)

  const condicionesPalabras = palabras.map(palabra => ({
    OR: [
      { descripcion: { contains: palabra, mode: 'insensitive' } },
      { observaciones: { contains: palabra, mode: 'insensitive' } },
      { ubicacionLibre: { contains: palabra, mode: 'insensitive' } },
      { marca: { contains: palabra, mode: 'insensitive' } },
      { sku: { contains: palabra, mode: 'insensitive' } }
    ]
  }))

  const where = {
    AND: [
      ...condicionesPalabras,
      marca ? { marca: { contains: marca, mode: 'insensitive' } } : {},
      unidad ? { unidad: { equals: unidad } } : {},
      estante ? { estante: { numero: { equals: estante.toString() } } } : {},
      repisa ? { repisa: { letra: { equals: repisa } } } : {},
      minCantidad ? { cantidad: { gte: parseFloat(minCantidad) } } : {},
      maxCantidad ? { cantidad: { lte: parseFloat(maxCantidad) } } : {}
    ]
  }

  try {
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          repisa: true,
          estante: true
        },
        skip: parseInt(skip),
        take: parseInt(take),
        orderBy: { [sortBy]: order === 'asc' ? 'asc' : 'desc' }
      }),
      prisma.producto.count({ where })
    ])
    res.json({ productos, total })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// Crear producto
router.post('/', async (req, res) => {
  try {
    // Arma el objeto SOLO con campos válidos
    const data = {
      sku: req.body.sku,
      marca: req.body.marca,
      descripcion: req.body.descripcion,
      cantidad: req.body.cantidad !== undefined ? parseFloat(req.body.cantidad) : undefined,
      unidad: req.body.unidad,
      observaciones: req.body.observaciones,
      repisaId: req.body.repisaId !== undefined && req.body.repisaId !== null && req.body.repisaId !== "" ? parseInt(req.body.repisaId) : null,
      estanteId: req.body.estanteId !== undefined && req.body.estanteId !== null && req.body.estanteId !== "" ? parseInt(req.body.estanteId) : null,
      ubicacionLibre: req.body.ubicacionLibre
    }
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k])

    const nuevoProducto = await prisma.producto.create({ data })
    res.status(201).json(nuevoProducto)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al crear el producto' })
  }
})

// Actualizar producto existente
router.put('/:id', async (req, res) => {
  const { id } = req.params
  try {
    // Arma el objeto SOLO con campos válidos
    const data = {
      sku: req.body.sku,
      marca: req.body.marca,
      descripcion: req.body.descripcion,
      cantidad: req.body.cantidad !== undefined ? parseFloat(req.body.cantidad) : undefined,
      unidad: req.body.unidad,
      observaciones: req.body.observaciones,
      repisaId: req.body.repisaId !== undefined && req.body.repisaId !== null && req.body.repisaId !== "" ? parseInt(req.body.repisaId) : null,
      estanteId: req.body.estanteId !== undefined && req.body.estanteId !== null && req.body.estanteId !== "" ? parseInt(req.body.estanteId) : null,
      ubicacionLibre: req.body.ubicacionLibre
    }
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k])

    const productoActualizado = await prisma.producto.update({
      where: { id: parseInt(id) },
      data
    })
    res.json(productoActualizado)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al actualizar el producto' })
  }
})

// Eliminar producto (borrado normal y forzado)
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const force = req.query.force === 'true'
  try {
    if (!force) {
      // Borrado normal
      await prisma.producto.delete({ where: { id: parseInt(id) } })
      return res.json({ mensaje: 'Producto eliminado correctamente' })
    } else {
      // Borrado forzado: elimina dependencias primero
      await prisma.ventaItem.deleteMany({ where: { productoId: parseInt(id) } })
      await prisma.movimiento.deleteMany({ where: { productoId: parseInt(id) } })
      await prisma.producto.delete({ where: { id: parseInt(id) } })
      return res.json({ mensaje: 'Producto y relaciones eliminadas correctamente' })
    }
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({
        error: 'El producto tiene ventas o movimientos asociados. ¿Desea eliminarlas también?',
        necesitaConfirmacion: true
      })
    }
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar el producto' })
  }
})

export default router
