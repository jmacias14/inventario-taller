import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function limpiarBase() {
  try {
    console.log("⏳ Borrando movimientos, items de ventas y productos...")

    await prisma.movimiento.deleteMany()
    await prisma.ventaItem.deleteMany()
    await prisma.venta.deleteMany()
    await prisma.producto.deleteMany()

    console.log("✅ Base de datos limpiada con éxito.")
  } catch (error) {
    console.error("❌ Error al limpiar la base de datos:", error)
  } finally {
    await prisma.$disconnect()
  }
}

limpiarBase()
