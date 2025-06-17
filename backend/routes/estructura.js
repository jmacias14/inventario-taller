import express from 'express'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// GET /estructura
router.get('/', async (req, res) => {
  try {
    const repisas = await prisma.repisa.findMany({
      include: { estantes: true },
      orderBy: { letra: 'asc' }
    })

    // FILTRA la repisa "NINGUNO" para que no aparezca en el UI
    const repisasFiltradas = repisas.filter(repisa => repisa.letra !== "NINGUNO")

    // Formatear para enviar repisa con id y estantes con id y numero
    const estructura = repisasFiltradas.map(repisa => ({
      letra: repisa.letra,
      id: repisa.id,
      estantes: repisa.estantes
        .map(est => ({
          id: est.id,
          numero: est.numero
        }))
        .sort((a, b) => {
          const numA = parseInt(a.numero)
          const numB = parseInt(b.numero)
          return numA - numB
        })
    }))

    res.json(estructura)
  } catch (error) {
    console.error('Error al obtener repisas:', error)
    res.status(500).json({ error: 'Error al obtener la estructura.' })
  }
})

export default router
