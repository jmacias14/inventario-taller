import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// --- FUNCION PARA ASEGURAR REPISA Y ESTANTE "NINGUNO" ---
async function asegurarRepisaNinguno() {
  let repisa = await prisma.repisa.findUnique({ where: { letra: "NINGUNO" } });
  if (!repisa) {
    repisa = await prisma.repisa.create({ data: { letra: "NINGUNO" } });
  }
  let estante = await prisma.estante.findFirst({ where: { repisaId: repisa.id, numero: "1" } });
  if (!estante) {
    estante = await prisma.estante.create({ data: { numero: "1", repisaId: repisa.id } });
  }
  return { repisa, estante };
}

// Crear repisa y estantes
router.post('/repisa', async (req, res) => {
  let { letra, cantidadEstantes } = req.body;

  if (
    !letra ||
    typeof letra !== 'string' ||
    !cantidadEstantes ||
    isNaN(cantidadEstantes) ||
    cantidadEstantes <= 0
  ) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  letra = letra.trim().toUpperCase();

  try {
    const existente = await prisma.repisa.findUnique({ where: { letra } });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una repisa con esa letra.' });
    }

    const repisa = await prisma.repisa.create({ data: { letra } });

    const estantes = Array.from({ length: cantidadEstantes }, (_, i) => ({
      numero: String(i + 1),
      repisaId: repisa.id,
    }));

    await prisma.estante.createMany({ data: estantes });

    res.status(201).json({ mensaje: 'Repisa y estantes creados correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear repisa y estantes.' });
  }
});

// Obtener repisas con sus estantes
router.get('/repisa', async (req, res) => {
  try {
    const repisas = await prisma.repisa.findMany({
      include: {
        estantes: true,
      },
      orderBy: {
        letra: 'asc',
      },
    });

    res.json(repisas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener repisas.' });
  }
});

// Eliminar repisa y sus estantes, reasignando productos a "NINGUNO"
router.delete('/repisa/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    // 1. Asegura que exista la repisa y estante "NINGUNO"
    const { repisa: repisaNinguno, estante: estanteNinguno } = await asegurarRepisaNinguno();

    // 2. Busca todos los estantes de la repisa a eliminar
    const estantesABorrar = await prisma.estante.findMany({ where: { repisaId: id } });
    const estantesIds = estantesABorrar.map(e => e.id);

    // 3. Reasigna productos que estén asociados a la repisa o sus estantes a "NINGUNO"
    await prisma.producto.updateMany({
      where: {
        OR: [
          { repisaId: id },
          { estanteId: { in: estantesIds } }
        ]
      },
      data: {
        repisaId: repisaNinguno.id,
        estanteId: estanteNinguno.id
      }
    });

    // 4. Borra estantes y repisa
    await prisma.estante.deleteMany({ where: { repisaId: id } });
    await prisma.repisa.delete({ where: { id } });

    res.json({ mensaje: 'Repisa eliminada y productos reasignados correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar repisa.' });
  }
});

// Actualizar cantidad de estantes (solo agregar)
router.put('/repisa/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const nuevaCantidad = parseInt(req.body.nuevaCantidad);

  if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
    return res.status(400).json({ error: 'Cantidad inválida.' });
  }

  try {
    const repisa = await prisma.repisa.findUnique({
      where: { id },
      include: { estantes: true },
    });

    if (!repisa) return res.status(404).json({ error: 'Repisa no encontrada.' });

    const cantidadActual = repisa.estantes.length;

    if (nuevaCantidad <= cantidadActual) {
      return res.status(400).json({ error: 'Solo se permite aumentar la cantidad.' });
    }

    const nuevos = Array.from(
      { length: nuevaCantidad - cantidadActual },
      (_, i) => ({
        numero: String(cantidadActual + i + 1),
        repisaId: repisa.id,
      })
    );

    await prisma.estante.createMany({ data: nuevos });

    res.json({ mensaje: 'Estantes actualizados.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar estantes.' });
  }
});

export default router;
