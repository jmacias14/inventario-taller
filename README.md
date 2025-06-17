# Inventario Taller - Sistema de Gestión de Repuestos

Este proyecto es una aplicación web completa para gestionar el inventario de un taller mecánico.

## 📦 Tecnologías usadas

- **Frontend**: React + Tailwind CSS + Zustand
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL + Prisma ORM
- **Testing (pendiente)**: Jest (backend), Vitest (frontend)

---

## 🚀 Instalación local

### 1. Clonar el proyecto
```bash
unzip inventario-taller.zip
cd inventario-taller
```

### 2. Configurar la base de datos PostgreSQL
Asegúrate de tener PostgreSQL corriendo y crea una base de datos llamada `inventario`.

Editá el archivo `.env` en `backend/` y completá con tus credenciales:
```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/inventario"
```

### 3. Instalar dependencias del backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

El servidor quedará corriendo en: `http://localhost:3001`

### 4. Instalar dependencias del frontend
```bash
cd ../frontend
npm install
npm run dev
```

Abrí el navegador en: `http://localhost:5173`

---

## 🧪 Funcionalidades implementadas

- Agregar/quitar productos con autocompletado por SKU.
- Visualización de stock con filtros por texto, marca, unidad y cantidad.
- Detalle modal de cada producto.
- Panel de ventas con carrito y confirmación.

---

## 📦 Estructura del proyecto

```
inventario-taller/
├── backend/
│   ├── index.js
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env
├── frontend/
│   └── ... (archivos React)
└── README.md
```

---

## 🌐 Exposición para pruebas

Podés usar herramientas como `localtunnel` o `ngrok` para mostrar tu app localmente en una URL pública.

Ejemplo:
```bash
npx localtunnel --port 5173
```

---

## 🛠️ Notas adicionales

- El backend fue preparado para desplegarse en Render.
- La base de datos está lista para Supabase o PostgreSQL tradicional.