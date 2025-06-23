-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL,
    "observaciones" TEXT,
    "repisaId" INTEGER,
    "estanteId" INTEGER,
    "ubicacionLibre" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "productoId" INTEGER NOT NULL,
    "ventaId" INTEGER,
    "repisaId" INTEGER,
    "estanteId" INTEGER,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" SERIAL NOT NULL,
    "comentarios" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaItem" (
    "id" SERIAL NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repisa" (
    "id" SERIAL NOT NULL,
    "letra" TEXT NOT NULL,

    CONSTRAINT "Repisa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estante" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "repisaId" INTEGER NOT NULL,

    CONSTRAINT "Estante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_key" ON "Producto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Repisa_letra_key" ON "Repisa"("letra");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_repisaId_fkey" FOREIGN KEY ("repisaId") REFERENCES "Repisa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_estanteId_fkey" FOREIGN KEY ("estanteId") REFERENCES "Estante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_repisaId_fkey" FOREIGN KEY ("repisaId") REFERENCES "Repisa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_estanteId_fkey" FOREIGN KEY ("estanteId") REFERENCES "Estante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estante" ADD CONSTRAINT "Estante_repisaId_fkey" FOREIGN KEY ("repisaId") REFERENCES "Repisa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
