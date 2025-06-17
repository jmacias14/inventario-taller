// insertar_productos.js
import axios from "axios";

const productos = [
  {
    "sku": "TEST-001",
    "descripcion": "Producto de prueba 1",
    "marca": "MarcaTest",
    "cantidad": 11,
    "unidad": "Unidad",
    "ubicacion": "A-2",
    "estante": "A",
    "repisa": "2",
    "observaciones": "Observaci\u00f3n 1"
  },
  {
    "sku": "TEST-002",
    "descripcion": "Producto de prueba 2",
    "marca": "MarcaTest",
    "cantidad": 12,
    "unidad": "Unidad",
    "ubicacion": "A-3",
    "estante": "A",
    "repisa": "3",
    "observaciones": "Observaci\u00f3n 2"
  },
  {
    "sku": "TEST-003",
    "descripcion": "Producto de prueba 3",
    "marca": "MarcaTest",
    "cantidad": 13,
    "unidad": "Unidad",
    "ubicacion": "A-4",
    "estante": "A",
    "repisa": "4",
    "observaciones": "Observaci\u00f3n 3"
  },
  {
    "sku": "TEST-004",
    "descripcion": "Producto de prueba 4",
    "marca": "MarcaTest",
    "cantidad": 14,
    "unidad": "Unidad",
    "ubicacion": "A-1",
    "estante": "A",
    "repisa": "1",
    "observaciones": "Observaci\u00f3n 4"
  },
  {
    "sku": "TEST-005",
    "descripcion": "Producto de prueba 5",
    "marca": "MarcaTest",
    "cantidad": 15,
    "unidad": "Unidad",
    "ubicacion": "A-2",
    "estante": "A",
    "repisa": "2",
    "observaciones": "Observaci\u00f3n 5"
  },
  {
    "sku": "TEST-006",
    "descripcion": "Producto de prueba 6",
    "marca": "MarcaTest",
    "cantidad": 16,
    "unidad": "Unidad",
    "ubicacion": "A-3",
    "estante": "A",
    "repisa": "3",
    "observaciones": "Observaci\u00f3n 6"
  },
  {
    "sku": "TEST-007",
    "descripcion": "Producto de prueba 7",
    "marca": "MarcaTest",
    "cantidad": 17,
    "unidad": "Unidad",
    "ubicacion": "A-4",
    "estante": "A",
    "repisa": "4",
    "observaciones": "Observaci\u00f3n 7"
  },
  {
    "sku": "TEST-008",
    "descripcion": "Producto de prueba 8",
    "marca": "MarcaTest",
    "cantidad": 18,
    "unidad": "Unidad",
    "ubicacion": "A-1",
    "estante": "A",
    "repisa": "1",
    "observaciones": "Observaci\u00f3n 8"
  },
  {
    "sku": "TEST-009",
    "descripcion": "Producto de prueba 9",
    "marca": "MarcaTest",
    "cantidad": 19,
    "unidad": "Unidad",
    "ubicacion": "A-2",
    "estante": "A",
    "repisa": "2",
    "observaciones": "Observaci\u00f3n 9"
  },
  {
    "sku": "TEST-010",
    "descripcion": "Producto de prueba 10",
    "marca": "MarcaTest",
    "cantidad": 20,
    "unidad": "Unidad",
    "ubicacion": "A-3",
    "estante": "A",
    "repisa": "3",
    "observaciones": "Observaci\u00f3n 10"
  },
  {
    "sku": "TEST-011",
    "descripcion": "Producto de prueba 11",
    "marca": "MarcaTest",
    "cantidad": 21,
    "unidad": "Unidad",
    "ubicacion": "A-4",
    "estante": "A",
    "repisa": "4",
    "observaciones": "Observaci\u00f3n 11"
  },
  {
    "sku": "TEST-012",
    "descripcion": "Producto de prueba 12",
    "marca": "MarcaTest",
    "cantidad": 22,
    "unidad": "Unidad",
    "ubicacion": "A-1",
    "estante": "A",
    "repisa": "1",
    "observaciones": "Observaci\u00f3n 12"
  },
  {
    "sku": "TEST-013",
    "descripcion": "Producto de prueba 13",
    "marca": "MarcaTest",
    "cantidad": 23,
    "unidad": "Unidad",
    "ubicacion": "A-2",
    "estante": "A",
    "repisa": "2",
    "observaciones": "Observaci\u00f3n 13"
  },
  {
    "sku": "TEST-014",
    "descripcion": "Producto de prueba 14",
    "marca": "MarcaTest",
    "cantidad": 24,
    "unidad": "Unidad",
    "ubicacion": "A-3",
    "estante": "A",
    "repisa": "3",
    "observaciones": "Observaci\u00f3n 14"
  },
  {
    "sku": "TEST-015",
    "descripcion": "Producto de prueba 15",
    "marca": "MarcaTest",
    "cantidad": 25,
    "unidad": "Unidad",
    "ubicacion": "A-4",
    "estante": "A",
    "repisa": "4",
    "observaciones": "Observaci\u00f3n 15"
  },
  {
    "sku": "TEST-016",
    "descripcion": "Producto de prueba 16",
    "marca": "MarcaTest",
    "cantidad": 26,
    "unidad": "Unidad",
    "ubicacion": "A-1",
    "estante": "A",
    "repisa": "1",
    "observaciones": "Observaci\u00f3n 16"
  },
  {
    "sku": "TEST-017",
    "descripcion": "Producto de prueba 17",
    "marca": "MarcaTest",
    "cantidad": 27,
    "unidad": "Unidad",
    "ubicacion": "A-2",
    "estante": "A",
    "repisa": "2",
    "observaciones": "Observaci\u00f3n 17"
  },
  {
    "sku": "TEST-018",
    "descripcion": "Producto de prueba 18",
    "marca": "MarcaTest",
    "cantidad": 28,
    "unidad": "Unidad",
    "ubicacion": "A-3",
    "estante": "A",
    "repisa": "3",
    "observaciones": "Observaci\u00f3n 18"
  },
  {
    "sku": "TEST-019",
    "descripcion": "Producto de prueba 19",
    "marca": "MarcaTest",
    "cantidad": 29,
    "unidad": "Unidad",
    "ubicacion": "A-4",
    "estante": "A",
    "repisa": "4",
    "observaciones": "Observaci\u00f3n 19"
  },
  {
    "sku": "TEST-020",
    "descripcion": "Producto de prueba 20",
    "marca": "MarcaTest",
    "cantidad": 30,
    "unidad": "Unidad",
    "ubicacion": "A-1",
    "estante": "A",
    "repisa": "1",
    "observaciones": "Observaci\u00f3n 20"
  }
];

async function insertar() {
  for (const producto of productos) {
    try {
      const res = await api.post("http://localhost:3001/products/add", producto);
      console.log("Agregado:", res.data.descripcion);
    } catch (err) {
      console.error("Error:", err.response?.data || err.message);
    }
  }
}

insertar();
