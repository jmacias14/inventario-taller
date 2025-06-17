import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import { api } from "../api.js";

export default function AgregarNuevoProducto({ volver }) {
  const [form, setForm] = useState({
    descripcion: "",
    marca: "",
    sku: "",
    repisaLetra: "",
    estanteNumero: "",
    ubicacionLibre: "",
    tipoUbicacion: "repisa",
    cantidad: "",
    unidad: "",
    observaciones: ""
  });

  const { showToast } = useToast();
  const [estructura, setEstructura] = useState([]);

  useEffect(() => {
    api.get("/estructura")
      .then(res => setEstructura(res.data))
      .catch(() => showToast("❌ No se pudieron cargar las repisas", "error"));
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { descripcion, marca, cantidad, unidad, tipoUbicacion } = form;
    const esOtro = tipoUbicacion === "otro";

    if (!descripcion || !marca || !cantidad || !unidad) {
      showToast("❌ Faltan campos obligatorios", "error");
      return;
    }

    if (esOtro && !form.ubicacionLibre) {
      showToast("❌ Debes ingresar una ubicación personalizada", "error");
      return;
    }

    if (!esOtro && (!form.repisaLetra || !form.estanteNumero)) {
      showToast("❌ Debes seleccionar repisa y estante", "error");
      return;
    }

    // Buscar los IDs correspondientes a la repisa y estante seleccionados
    const repisaSeleccionada = estructura.find(r => r.letra === form.repisaLetra);
    const repisaId = repisaSeleccionada?.id || null;
    const estanteSeleccionado = repisaSeleccionada?.estantes.find(e => e.numero === form.estanteNumero);
    const estanteId = estanteSeleccionado?.id || null;

    try {
      await api.post("/products", {
        descripcion: form.descripcion,
        marca: form.marca,
        sku: form.sku || null,
        unidad: form.unidad,
        cantidad: parseFloat(form.cantidad),
        observaciones: form.observaciones,
        tipoUbicacion: form.tipoUbicacion,
        repisaId: !esOtro ? repisaId : null,
        estanteId: !esOtro ? estanteId : null,
        ubicacionLibre: esOtro ? form.ubicacionLibre : null
      });

      showToast("✅ Producto agregado con éxito", "success");

      setForm({
        descripcion: "",
        marca: "",
        sku: "",
        repisaLetra: "",
        estanteNumero: "",
        ubicacionLibre: "",
        tipoUbicacion: "repisa",
        cantidad: "",
        unidad: "",
        observaciones: ""
      });
    } catch (error) {
      console.error(error);
      const mensaje = error?.response?.data?.error || "Error al agregar producto";
      showToast(`❌ ${mensaje}`, "error");
    }
  };

  // Opcionales para el dropdown de estantes, basado en la repisa seleccionada
  const estantes = estructura.find(r => r.letra === form.repisaLetra)?.estantes || [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Agregar nuevo producto</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow">
        <input
          name="sku"
          placeholder="Código (SKU)"
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={form.sku}
          onChange={handleInputChange}
        />
        <input
          name="descripcion"
          placeholder="Descripción *"
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={form.descripcion}
          onChange={handleInputChange}
        />
        <input
          name="marca"
          placeholder="Marca *"
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={form.marca}
          onChange={handleInputChange}
        />

        <div className="flex items-center gap-6 col-span-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipoUbicacion"
              value="repisa"
              checked={form.tipoUbicacion === "repisa"}
              onChange={handleInputChange}
              className="accent-blue-600"
            />
            <span>Repisa</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipoUbicacion"
              value="otro"
              checked={form.tipoUbicacion === "otro"}
              onChange={handleInputChange}
              className="accent-blue-600"
            />
            <span>Otro</span>
          </label>
        </div>

        {form.tipoUbicacion === "repisa" ? (
          <>
            <select
              name="repisaLetra"
              value={form.repisaLetra}
              onChange={handleInputChange}
              className="rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione repisa</option>
              {estructura.map((r) => (
                <option key={r.id} value={r.letra}>
                  {r.letra}
                </option>
              ))}
            </select>

            <select
              name="estanteNumero"
              value={form.estanteNumero}
              onChange={handleInputChange}
              className="rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione estante</option>
              {estantes.map((num) => (
                <option key={num.id} value={num.numero}>
                  {num.numero}
                </option>
              ))}
            </select>
          </>
        ) : (
          <input
            name="ubicacionLibre"
            placeholder="Ubicación personalizada *"
            className="col-span-2 rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
            value={form.ubicacionLibre}
            onChange={handleInputChange}
          />
        )}

        <input
          name="cantidad"
          placeholder="Cantidad *"
          type="number"
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={form.cantidad}
          onChange={handleInputChange}
        />

        <select
          name="unidad"
          value={form.unidad}
          onChange={handleInputChange}
          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccione unidad *</option>
          <option value="Unidad">Unidad</option>
          <option value="Litro">Litro</option>
          <option value="Metro">Metro</option>
          <option value="Paquete">Paquete</option>
        </select>

        <textarea
          name="observaciones"
          placeholder="Observaciones"
          className="col-span-2 rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-blue-500"
          value={form.observaciones}
          onChange={handleInputChange}
        />
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={handleSubmit}
          className="inline-block rounded bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
        >
          Guardar
        </button>
        <button
          onClick={volver}
          className="inline-block rounded bg-gray-300 px-6 py-3 text-base font-medium text-gray-800 hover:bg-gray-400"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
