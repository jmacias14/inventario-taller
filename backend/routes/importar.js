import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import prisma from '../db.js';
import fs from 'fs'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

function normalizarSku(sku) {
  return sku.toString().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/\s+/g, '')
}

function limpiarTexto(text) {
  return text?.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "") || ""
}

// Permite encabezados con o sin tildes, mayúsculas o espacios
function mapearFila(filaCruda, headerMap) {
  return {
    sku: filaCruda[headerMap.sku],
    descripcion: filaCruda[headerMap.descripcion],
    cantidad: filaCruda[headerMap.cantidad],
    marca: filaCruda[headerMap.marca],
    unidad: filaCruda[headerMap.unidad],
    observaciones: filaCruda[headerMap.observaciones],
    repisaLetra: filaCruda[headerMap.repisaLetra],
    estanteNumero: filaCruda[headerMap.estanteNumero]
  }
}

async function generarSkuUnico(baseSku, tx) {
  let nuevoSku = baseSku
  let contador = 2
  while (await tx.producto.findUnique({ where: { sku: nuevoSku } })) {
    nuevoSku = `${baseSku}-${contador}`
    contador++
  }
  return nuevoSku
}

const PRISMA_TIMEOUT_MS = 60000 // 1 minuto

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('Archivo no enviado')

    const workbook = xlsx.readFile(req.file.path)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    // --- Obtener encabezados mapeando a keys "internas" ---
    const headersRaw = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] || []
    console.log("[DEBUG] Encabezados detectados:", headersRaw)
    const campos = [
      { key: "sku", variantes: ["sku"] },
      { key: "descripcion", variantes: ["descripcion", "descripción"] },
      { key: "cantidad", variantes: ["cantidad"] },
      { key: "marca", variantes: ["marca"] },
      { key: "unidad", variantes: ["unidad"] },
      { key: "observaciones", variantes: ["observaciones", "observacion", "observación"] },
      { key: "repisaLetra", variantes: ["repisa", "repisaletra"] },
      { key: "estanteNumero", variantes: ["estante", "estantenumero"] }
    ]

    // Genera un map header estandarizado → columna real
    const headerMap = {}
    for (const campo of campos) {
      const encontrado = headersRaw.find(h =>
        campo.variantes.some(v =>
          limpiarTexto(h) === limpiarTexto(v)
        )
      )
      headerMap[campo.key] = encontrado
    }
    console.log("[DEBUG] headerMap:", headerMap)

    const rawRows = xlsx.utils.sheet_to_json(sheet)
    console.log("[DEBUG] rawRows muestra (primeras 3 filas):", rawRows.slice(0, 3))

    const errores = []
    const avisos = []
    const skusVistos = new Set()

    // Usar el map de encabezados flexible
    const filasProcesadas = rawRows.map((filaCruda, index) => {
      const fila = mapearFila(filaCruda, headerMap)
      if (index < 3) console.log(`[DEBUG] Fila procesada #${index + 2}:`, fila)
      const skuRaw = fila.sku
      const descripcionRaw = fila.descripcion
      const cantidadRaw = fila.cantidad
      const marcaRaw = fila.marca
      const unidadRaw = fila.unidad
      const observacionesRaw = fila.observaciones
      const repisaRaw = (fila.repisaLetra || "").toString().trim().toUpperCase()
      const estanteNumeroRaw = fila.estanteNumero

      let filaAvisos = []

      const descripcion = descripcionRaw?.toString().trim() || "No Posee"
      if (!descripcionRaw) filaAvisos.push(`Fila ${index + 2}: descripción vacía.`)

      const cantidad = (!isNaN(Number(cantidadRaw)) && cantidadRaw !== null && cantidadRaw !== "")
        ? Number(cantidadRaw) : 0
      if (isNaN(Number(cantidadRaw))) filaAvisos.push(`Fila ${index + 2}: cantidad inválida.`)

      const marca = marcaRaw?.toString().trim() || "No Posee"
      const unidad = unidadRaw?.toString().trim() || "No Posee"
      const observaciones = observacionesRaw?.toString().trim() || ""

      let sku = (skuRaw && skuRaw.toString().trim()) ? normalizarSku(skuRaw.toString().trim()) : `AUTOGEN${index + 2}`
      if (!skuRaw) filaAvisos.push(`Fila ${index + 2}: SKU generado automáticamente.`)

      const estanteRaw = (estanteNumeroRaw !== undefined && estanteNumeroRaw !== null && estanteNumeroRaw !== "")
        ? String(estanteNumeroRaw) : ""

      if (filaAvisos.length > 0) avisos.push(...filaAvisos)

      return {
        filaIndex: index + 2,
        sku,
        descripcion,
        cantidad,
        marca,
        unidad,
        observaciones,
        repisaRaw,
        estanteRaw
      }
    })
    console.log("[DEBUG] Primeras 3 filas ya mapeadas/finales:", filasProcesadas.slice(0, 3))

    // --- Detectar repisas y estantes para crear si faltan ---
    const repisaMap = {}
    for (const fila of filasProcesadas) {
      if (/^[A-Z]$/.test(fila.repisaRaw) && /^\d+$/.test(fila.estanteRaw)) {
        const letra = fila.repisaRaw
        const numero = fila.estanteRaw
        if (!repisaMap[letra]) repisaMap[letra] = new Set()
        repisaMap[letra].add(numero)
      }
    }

    await prisma.$transaction(async (tx) => {
      // --- Crear repisas y estantes que faltan ---
      for (const letra of Object.keys(repisaMap)) {
        const estantesNecesarios = repisaMap[letra]
        let repisa = await tx.repisa.findFirst({ where: { letra } })

        if (!repisa) {
          repisa = await tx.repisa.create({
            data: {
              letra,
              estantes: {
                create: [...estantesNecesarios].map(n => ({ numero: String(n) }))
              }
            }
          })
          avisos.push(`Repisa ${letra} creada con ${estantesNecesarios.size} estantes.`)
        } else {
          const existentes = await tx.estante.findMany({ where: { repisaId: repisa.id } })
          const existentesSet = new Set(existentes.map(e => e.numero))
          const faltantes = [...estantesNecesarios].filter(e => !existentesSet.has(String(e)))

          if (faltantes.length > 0) {
            await tx.estante.createMany({
              data: faltantes.map(n => ({ numero: String(n), repisaId: repisa.id }))
            })
            avisos.push(`Repisa ${letra} actualizada con ${faltantes.length} estantes nuevos.`)
          }
        }
      }

      // --- Insertar productos y movimientos ---
      for (const fila of filasProcesadas) {
        let {
          filaIndex, sku, descripcion, cantidad,
          marca, unidad, observaciones,
          repisaRaw, estanteRaw
        } = fila

        const skuOriginal = sku
        let intento = 2
        while (skusVistos.has(sku)) {
          sku = `${skuOriginal}-${intento}`
          intento++
        }
        skusVistos.add(sku)

        sku = await generarSkuUnico(sku, tx)

        let repisa = null
        let estante = null
        let ubicacionLibre = null

        if (/^[A-Z]$/.test(repisaRaw) && /^\d+$/.test(estanteRaw)) {
          repisa = await tx.repisa.findFirst({ where: { letra: repisaRaw } })
          if (repisa) {
            estante = await tx.estante.findFirst({
              where: { numero: String(estanteRaw), repisaId: repisa.id }
            })
          }
        } else if ((repisaRaw && repisaRaw.trim() !== "") || (estanteRaw && estanteRaw.trim() !== "")) {
          ubicacionLibre = `${repisaRaw} ${estanteRaw}`.trim()
        } else {
          ubicacionLibre = "No Posee"
        }

        let dataProducto = {
          descripcion,
          marca,
          unidad,
          cantidad,
          observaciones,
          sku
        }

        if (ubicacionLibre && ubicacionLibre.trim() !== "") {
          dataProducto.ubicacionLibre = ubicacionLibre.trim()
        } else if (repisa && estante) {
          dataProducto.repisa = { connect: { id: repisa.id } }
          dataProducto.estante = { connect: { id: estante.id } }
        } else {
          errores.push(`Fila ${filaIndex}: Ubicación inválida`)
          continue
        }

        try {
          // capturamos el producto recién creado
          const nuevoProducto = await tx.producto.create({ data: dataProducto })

          // si hay cantidad, registramos el movimiento
          if (cantidad > 0) {
            await tx.movimiento.create({
              data: {
                tipo: 'ingreso',
                productoId: nuevoProducto.id,
                cantidad,
                repisaId: nuevoProducto.repisaId,
                estanteId: nuevoProducto.estanteId,
                observaciones: 'Importación masiva'
              }
            })
          }
        } catch (err) {
          errores.push(`Fila ${filaIndex}: Error al guardar producto (${err.message})`)
        }
      }
    }, { timeout: PRISMA_TIMEOUT_MS })

    fs.unlinkSync(req.file.path)

    if (errores.length > 0) {
      return res.status(400).json({ success: false, errores, avisos })
    }

    return res.json({ success: true, avisos, message: "Importación completada correctamente." })

  } catch (error) {
    console.error(error)
    if (error.errores && error.avisos) {
      return res.status(400).json({ success: false, errores: error.errores, avisos: error.avisos })
    }
    if (error.code === "P2028") {
      return res.status(500).json({
        success: false,
        errores: ["Error: El proceso de importación fue demasiado largo."],
        avisos: []
      })
    }
    return res.status(500).json({ success: false, errores: [error.message || "Error desconocido"], avisos: [] })
  }
})

export default router