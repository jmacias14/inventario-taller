// scripts/generar_productos_secuenciales.js
const axios = require("axios");
const fs = require("fs");

const marcas = ["Deutz", "Bahco", "John Deere", "Massey Fergusson", "FIAT"];
const unidades = ["Unidad", "Litros"];
const ubicacionConfigPath = "../frontend/public/config/ubicacion.config.json";

function padSKU(num) {
  return num.toString().padStart(15, "0");
}

function elegirAleatorio(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generarProductos(cantidad) {
  let config;
  try {
    const contenido = fs.readFileSync(ubicacionConfigPath, "utf-8");
    config = JSON.parse(contenido);
  } catch (err) {
    console.error("No se pudo leer el archivo de configuración:", err.message);
    return;
  }

  const repisas = Object.keys(config);
  if (repisas.length === 0) {
    console.error("No hay repisas definidas en la configuración.");
    return;
  }

  for (let i = 1; i <= cantidad; i++) {
    const repisa = elegirAleatorio(repisas);
    const estantes = config[repisa];
    const estante = elegirAleatorio(estantes);

    const producto = {
      sku: padSKU(i),
      descripcion: `Producto autogen ${i}`,
      marca: elegirAleatorio(marcas),
      cantidad: Math.floor(Math.random() * 100) + 1,
      unidad: elegirAleatorio(unidades),
      ubicacion: `${repisa}-${estante}`,
      estante,
      repisa,
      observaciones: `Observacion Aleatoria ${i}`
    };

    try {
      const res = await api.post("http://localhost:3001/products/add", producto);
      console.log(`✓ Agregado: ${producto.descripcion} (SKU: ${producto.sku})`);
    } catch (err) {
      console.error(`✗ Error al agregar SKU ${producto.sku}:`, err.response?.data || err.message);
    }
  }
}

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question("¿Cuántos productos querés generar? ", (respuesta) => {
  const cantidad = parseInt(respuesta, 10);
  if (isNaN(cantidad) || cantidad <= 0) {
    console.log("Cantidad inválida.");
  } else {
    generarProductos(cantidad);
  }
  readline.close();
});
