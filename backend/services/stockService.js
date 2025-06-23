import prisma from '../db.js';

export async function changeStock({ productoId, delta, tipoMovimiento, referenciaId = null, contexto = '', updateData = {} }) {
  // Leer estado actual
  const prodAntes = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!prodAntes) throw new Error(`Producto ${productoId} no encontrado`);
  // Calcular nueva cantidad
  const nuevaCantidad = prodAntes.cantidad + delta;

  // Ejecutar transacción: actualizar producto y crear movimiento
  const [prodActualizado, mov] = await prisma.$transaction([
    prisma.producto.update({ where: { id: productoId }, data: { ...updateData, cantidad: nuevaCantidad } }),
    prisma.movimiento.create({
      data: {
        productoId,
        tipo: tipoMovimiento,
        cantidad: Math.abs(delta),
        observaciones: contexto,
        ventaId: referenciaId
      }
    })
  ]);

  return prodActualizado;
}
