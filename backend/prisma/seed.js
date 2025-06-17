import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crea la repisa "NINGUNO" si no existe
  let repisa = await prisma.repisa.findUnique({ where: { letra: "NINGUNO" } });
  if (!repisa) {
    repisa = await prisma.repisa.create({ data: { letra: "NINGUNO" } });
    console.log('Repisa "NINGUNO" creada.');
  } else {
    console.log('Repisa "NINGUNO" ya existe.');
  }

  // Crea el estante "1" para la repisa "NINGUNO" si no existe
  let estante = await prisma.estante.findFirst({ where: { repisaId: repisa.id, numero: "1" } });
  if (!estante) {
    estante = await prisma.estante.create({ data: { numero: "1", repisaId: repisa.id } });
    console.log('Estante "1" de la repisa "NINGUNO" creado.');
  } else {
    console.log('Estante "1" de la repisa "NINGUNO" ya existe.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
