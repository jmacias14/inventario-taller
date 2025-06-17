// buscarUpdates.js
import fs from 'fs'
import path from 'path'

// Cambiá esto si tu carpeta raíz no es la actual:
const rootDir = process.cwd()
const results = []

function searchFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    // Busca 'prisma.producto.update(' en cualquier parte de la línea
    if (line.includes('prisma.producto.update')) {
      // Extrae la línea completa y las 3 siguientes para contexto
      const context = [line.trim()]
      for (let i = 1; i <= 3; i++) {
        if (lines[idx + i]) context.push(lines[idx + i].trim())
      }
      results.push({
        file: filePath,
        line: idx + 1,
        context: context.join('\n')
      })
    }
  })
}

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath)
    } else if (file.endsWith('.js')) {
      searchFile(fullPath)
    }
  })
}

// --- Comienza la búsqueda ---
walk(rootDir)

if (results.length === 0) {
  console.log('No se encontraron llamadas a prisma.producto.update en el proyecto.')
} else {
  console.log('--- Llamadas a prisma.producto.update encontradas: ---\n')
  results.forEach(r => {
    console.log(`Archivo: ${r.file}`)
    console.log(`Línea:   ${r.line}`)
    console.log('------ Contexto ------')
    console.log(r.context)
    console.log('----------------------\n')
  })
  console.log('Pegá este resultado en el chat para que te ayude a analizar cada línea.')
}
