// backend/routes/products.js

import express from 'express'
import prisma from '../db.js'
import { changeStock } from '../services/stockService.js'

const router = express.Router()

// Obtener productos con filtros y búsqueda avanzada
router.get('/', async (req, res) => {
  const {
    query = '',
    marca,
    unidad,
    minCantidad,
    maxCantidad,
    repisa,
    estante,
    skip = 0,
    take = 50,
    sortBy = 'id',
    order = 'desc'
  } = req.query

  const palabras = query.trim().toLowerCase().split(/\s+/).filter(p => p)
  const condicionesPalabras = palabras.map(palabra => ({
    OR: [
      { sku: { contains: palabra, mode: 'insensitive' } },
      { marca: { contains: palabra, mode: 'insensitive' } },
      { descripcion: { contains: palabra, mode: 'insensitive' } },
      { observaciones: { contains: palabra, mode: 'insensitive' } }
    ]
  }))

  try {
    const filtros = [
      ...condicionesPalabras,
      marca ? { marca: { equals: marca } } : {},
      unidad ? { unidad: { equals: unidad } } : {},
      minCantidad ? { cantidad: { gte: parseFloat(minCantidad) } } : {},
      maxCantidad ? { cantidad: { lte: parseFloat(maxCantidad) } } : {},
      repisa ? { repisa: { letra: { equals: repisa } } } : {},
      estante ? { estante: { numero: { equals: parseInt(estante) } } } : {}
    ]

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where: { AND: filtros },
        skip: Number(skip),
        take: Number(take),
        orderBy: { [sortBy]: order },
        include: {
          repisa: { select: { letra: true } },
          estante: { select: { numero: true } }
        }
      }),
      prisma.producto.count({ where: { AND: filtros } })
    ])

    return res.json({ success: true, productos, total })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Error al obtener productos' })
  }
})

// Obtener producto por SKU para validaciones
router.get('/sku/:sku', async (req, res) => {
  const { sku } = req.params
  try {
    const producto = await prisma.producto.findUnique({
      where: { sku },
      include: {
        repisa: { select: { letra: true } },
        estante: { select: { numero: true } }
      }
    })
    if (!producto) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' })
    }
    return res.json({ success: true, producto })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

// Crear producto (o sumar cantidad si existe) y registrar movimiento
router.post('/', async (req, res) => {
  try {
    const { tipoUbicacion, origen, repisaId, estanteId, ubicacionLibre, ...rest } = req.body

    const dataCommon = { ...rest }
    if (tipoUbicacion === 'otro') {
      dataCommon.ubicacionLibre = ubicacionLibre
      dataCommon.repisaId = null
      dataCommon.estanteId = null
    } else {
      dataCommon.repisaId = repisaId
      dataCommon.estanteId = estanteId
      dataCommon.ubicacionLibre = null
    }

    const existente = await prisma.producto.findUnique({ where: { sku: rest.sku } })
    if (existente) {
      const productoActualizado = await changeStock({
        productoId: existente.id,
        delta: Number(rest.cantidad),
        tipoMovimiento: 'INGRESO_MANUAL',
        referenciaId: null,
        contexto: 'Ingreso manual de producto (AgregarProductoNuevo.jsx)',
        updateData: { ...dataCommon }
      })
      return res.status(200).json({ success: true, producto: productoActualizado })
    } else {
      const nuevo = await prisma.producto.create({
        data: {
          ...rest,
          cantidad: 0,
          ...dataCommon
        }
      })
      const productoActualizado = await changeStock({
        productoId: nuevo.id,
        delta: Number(rest.cantidad),
        tipoMovimiento: 'INGRESO_MANUAL',
        referenciaId: null,
        contexto: 'Ingreso manual de producto (AgregarProductoNuevo.jsx)'
      })
      return res.status(201).json({ success: true, producto: productoActualizado })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

// Editar producto y registrar movimiento
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    // Extraemos repisa y estante para no incluirlos en rest
    const {
      tipoUbicacion,
      origen,
      repisaId,
      estanteId,
      ubicacionLibre,
      repisa,
      estante,
      ...rest
    } = req.body

    const updateData = { ...rest }
    if (tipoUbicacion === 'otro') {
      updateData.ubicacionLibre = ubicacionLibre
      updateData.repisaId = null
      updateData.estanteId = null
    } else {
      updateData.repisaId = repisaId
      updateData.estanteId = estanteId
      updateData.ubicacionLibre = null
    }

    const prodAntes = await prisma.producto.findUnique({ where: { id } })
    if (!prodAntes) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' })
    }

    const delta = Number(rest.cantidad) - prodAntes.cantidad

    const productoActualizado = await changeStock({
      productoId: id,
      delta,
      tipoMovimiento: delta >= 0 ? 'ingreso' : 'egreso',
      referenciaId: null,
      contexto: 'Edición de producto',
      updateData
    })

    return res.json({ success: true, producto: productoActualizado })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: 'Error al actualizar producto' })
  }
})

// Eliminar un producto (y sus relaciones)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.ventaItem.deleteMany({ where: { productoId: id } })
    await prisma.movimiento.deleteMany({ where: { productoId: id } })
    await prisma.producto.delete({ where: { id } })
    return res.json({ success: true })
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'El producto tiene ventas o movimientos asociados. ¿Desea eliminarlas también?',
        necesitaConfirmacion: true
      })
    }
    console.error(error)
    return res.status(500).json({ success: false, error: 'Error al eliminar el producto' })
  }
})

export default router
