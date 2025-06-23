import express from 'express';
import prisma from '../db.js';
import { changeStock } from '../services/stockService.js';

const router = express.Router();

// Registrar venta y descontar stock
router.post('/', async (req, res) => {
  const { comentarios, productos } = req.body;
  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un producto' });
  }
  try {
    // Validación de stock antes de crear la venta
    for (const p of productos) {
      const prod = await prisma.producto.findUnique({ where: { id: p.productoId } });
      if (!prod) {
        return res.status(404).json({ error: `Producto con id ${p.productoId} no encontrado` });
      }
      if (prod.cantidad < p.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para ${prod.descripcion || prod.sku}` });
      }
    }
    const venta = await prisma.venta.create({
      data: {
        comentarios,
        items: {
          create: productos.map((p) => ({
            productoId: p.productoId,
            cantidad: p.cantidad
          }))
        }
      },
      include: { items: true }
    });

    // Actualizar stock y registrar movimientos
    for (const item of venta.items) {
      await changeStock({
        productoId: item.productoId,
        delta: -item.cantidad,
        tipoMovimiento: 'egreso',
        referenciaId: venta.id,
        contexto: `Venta ID ${venta.id}`
      });
    }

    res.status(201).json({ mensaje: 'Venta registrada', ventaId: venta.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar venta' });
  }
});

// Anular venta y reingresar stock
router.post('/anular/:id', async (req, res) => {
  const ventaId = Number(req.params.id);
  try {
    const venta = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: { items: true }
    });
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    if (venta.anulada) {
      return res.status(400).json({ error: 'Venta ya anulada' });
    }

    // Reingresar stock y registrar movimientos
    for (const item of venta.items) {
      await changeStock({
        productoId: item.productoId,
        delta: item.cantidad,
        tipoMovimiento: 'ingreso',
        referenciaId: ventaId,
        contexto: `Cancelación Venta ID ${ventaId}`
      });
    }

    // Marcar venta como anulada
    await prisma.venta.update({
      where: { id: ventaId },
      data: { anulada: true }
    });

    res.json({ mensaje: 'Venta anulada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al anular la venta' });
  }
});

// Obtener historial de ventas con todos los datos del producto
router.get('/history', async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        items: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const resultado = ventas.map((venta) => ({
      id: venta.id,
      fecha: venta.createdAt,
      comentarios: venta.comentarios,
      anulada: venta.anulada,
      productos: venta.items.map((item) => ({
        id: item.producto.id,
        descripcion: item.producto.descripcion,
        sku: item.producto.sku,
        unidad: item.producto.unidad,
        cantidad: item.cantidad,
        marca: item.producto.marca,
        observaciones: item.producto.observaciones,
        repisaId: item.producto.repisaId,
        estanteId: item.producto.estanteId,
        ubicacionLibre: item.producto.ubicacionLibre
      }))
    }));

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial de ventas' });
  }
});

export default router;
