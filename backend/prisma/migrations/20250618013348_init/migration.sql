/*
  Warnings:

  - You are about to drop the column `observacion` on the `Movimiento` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Movimiento" DROP COLUMN "observacion",
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "ubicacionLibre" TEXT;
