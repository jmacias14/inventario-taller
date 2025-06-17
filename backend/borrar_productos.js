// borrar_productos.js
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Borra ventas y movimientos antes de borrar productos para evitar errores de integridad
  await prisma.ventaItem.deleteMany()
  await prisma.movimiento.deleteMany()
  await prisma.venta.deleteMany()
  // Borra todos los productos
  await prisma.producto.deleteMany()
  console.log('¡Todos los productos y movimientos/ventas relacionados fueron eliminados!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
