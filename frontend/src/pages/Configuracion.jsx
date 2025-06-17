import { useEffect, useState } from "react";
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ChevronDown } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { api } from "../api.js";

function logError(origen, error, contexto = "") {
  console.error(
    `%c[ERROR - ${origen}]%c${contexto ? ` (${contexto})` : ""}`,
    "background: #e57373; color: white; padding: 2px 4px; border-radius: 4px",
    "",
    error
  );
  if (error?.response) {
    console.error("Response data:", error.response.data);
  }
}

export default function Configuracion() {
  const [letraRepisa, setLetraRepisa] = useState("");
  const [cantidadEstantes, setCantidadEstantes] = useState(1);
  const [repisas, setRepisas] = useState([]);
  const [editarId, setEditarId] = useState(null);
  const [editarLetra, setEditarLetra] = useState("");
  const [letraOriginal, setLetraOriginal] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState(0);
  const [confirmarEliminarId, setConfirmarEliminarId] = useState(null);
  const [mostrarModalAgregar, setMostrarModalAgregar] = useState(false);
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [erroresImportacion, setErroresImportacion] = useState([]);
  const [mostrarErroresModal, setMostrarErroresModal] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [productosAsociados, setProductosAsociados] = useState(0);

  const { showToast } = useToast();

  useEffect(() => {
    obtenerRepisas();
  }, []);

  const obtenerRepisas = async () => {
    try {
      const res = await api.get("/config/repisa");
      setRepisas(res.data);
    } catch (err) {
      logError("obtenerRepisas", err);
      showToast("Error al cargar repisas", "error");
    }
  };

  const validarLetra = (letra) => {
    if (!letra) {
      showToast("Debes ingresar una letra para la repisa", "error");
      return false;
    }
    if (!/^[A-Z]{1,10}$/.test(letra)) {
      showToast("La letra de la repisa debe tener solo letras (máx 10)", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const letraVal = letraRepisa.toUpperCase();
    if (!validarLetra(letraVal)) return;

    try {
      await api.post("/config/repisa", {
        letra: letraVal,
        cantidadEstantes: parseInt(cantidadEstantes),
      });
      showToast("Repisa y estantes agregados correctamente.", "success");
      setLetraRepisa("");
      setCantidadEstantes(1);
      setMostrarModalAgregar(false);
      obtenerRepisas();
    } catch (error) {
      logError("handleSubmit", error, "al agregar repisa");
      if (error.response?.status === 409) {
        showToast("Ya existe una repisa con ese nombre.", "error");
      } else {
        showToast("Error al agregar la repisa.", "error");
      }
    }
  };

  // CORREGIDO: Importación de Excel con Content-Type undefined
  const handleExcelUpload = async () => {
    if (!archivoExcel) return showToast("Seleccioná un archivo primero.", "error");
    const formData = new FormData();
    formData.append("file", archivoExcel);
    try {
      await api.post("/importar", formData, {
        headers: { 'Content-Type': undefined }
      });
      showToast("Productos importados correctamente.", "success");
      setErroresImportacion([]);
    } catch (error) {
      logError("handleExcelUpload", error);
      const errores = error.response?.data?.errores || [];
      setErroresImportacion(errores);
      showToast("Error al importar productos.", "error");
    }
  };

  const handleEliminarRepisa = async (id) => {
    try {
      await api.delete(`/config/repisa/${id}`);
      showToast("Repisa eliminada correctamente.", "success");
      setConfirmarEliminarId(null);
      obtenerRepisas();
    } catch (error) {
      logError("handleEliminarRepisa", error, `ID: ${id}`);
      showToast("Error al eliminar la repisa.", "error");
    }
  };

  const handleEditarClick = async (repisa) => {
    setEditarId(repisa.id);
    setEditarLetra(repisa.letra);
    setLetraOriginal(repisa.letra);
    setNuevaCantidad(repisa.estantes.length);
    setErrorEdicion("");
    try {
      const res = await api.get(`/api/productos?repisa=${repisa.letra}&take=1`);
      setProductosAsociados(res.data.total || 0);
    } catch (error) {
      setProductosAsociados(0);
      logError("handleEditarClick", error, "contando productos asociados");
    }
  };

  const handleConfirmarEdicion = async () => {
    const cantidad = parseInt(nuevaCantidad);
    const letraVal = editarLetra.toUpperCase();

    if (!validarLetra(letraVal)) return;

    if (!cantidad || cantidad < 1) {
      setErrorEdicion("Debe tener al menos 1 estante");
      logError("handleConfirmarEdicion", "Cantidad inválida", `Valor: ${cantidad}`);
      return;
    }

    if (letraOriginal !== letraVal && productosAsociados > 0) {
      showToast(
        `Advertencia: Hay ${productosAsociados} producto(s) asociados a la repisa "${letraOriginal}". Cambiar la letra puede afectar la referencia de ubicación de estos productos.`,
        "warning"
      );
    }

    try {
      await api.put(`/config/repisa/${editarId}`, {
        nuevaCantidad: cantidad,
        letra: letraVal,
      });
      showToast("Repisa editada correctamente.", "success");
      setEditarId(null);
      obtenerRepisas();
    } catch (error) {
      logError("handleConfirmarEdicion", error, `ID: ${editarId} / Body: ${cantidad}`);
      showToast("Error al editar la repisa.", "error");
      setEditarId(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Configuración</h1>

      {/* BOTÓN VER ERRORES */}
      {erroresImportacion.length > 0 && (
        <button
          onClick={() => setMostrarErroresModal(true)}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Ver Errores
        </button>
      )}

      {/* MODAL ERRORES */}
      {mostrarErroresModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
            <h2 className="text-lg font-semibold mb-4">Errores en la importación</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm max-h-80 overflow-y-auto">
              {erroresImportacion.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setMostrarErroresModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setErroresImportacion([]);
                  setMostrarErroresModal(false);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Limpiar Errores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repisas */}
      <details open className="group border border-gray-300 rounded-lg p-4 mb-4">
        <summary className="flex items-center gap-2 cursor-pointer font-medium">
          <ChevronDown className="w-5 h-5" />
          Configuración Repisas
        </summary>

        <div className="mt-4 space-y-4">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Letra</th>
                <th className="p-2 text-left">Estantes</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {repisas
                .filter(repisa => repisa.letra !== "NINGUNO")
                .map((repisa) => (
                  <tr key={repisa.id} className="border-t">
                    <td className="p-2">{repisa.letra}</td>
                    <td className="p-2">{repisa.estantes.length}</td>
                    <td className="p-2 space-x-2">
                      <button onClick={() => handleEditarClick(repisa)} className="text-blue-600">
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => setConfirmarEliminarId(repisa.id)} className="text-red-600">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <button
            onClick={() => setMostrarModalAgregar(true)}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Agregar repisa
          </button>
        </div>
      </details>

      {/* MODAL AGREGAR */}
      {mostrarModalAgregar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">Agregar nueva repisa</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1">Letra (máx. 10 letras):</label>
                <input
                  type="text"
                  maxLength={10}
                  pattern="[A-Za-z]{1,10}"
                  required
                  placeholder="Ej: A, REPISA01"
                  value={letraRepisa}
                  onChange={(e) => setLetraRepisa(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase())}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block mb-1">Cantidad de estantes:</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={cantidadEstantes}
                  onChange={(e) => setCantidadEstantes(e.target.value)}
                  className="w-full border rounded p-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalAgregar(false)}
                  className="bg-gray-300 px-3 py-1 rounded"
                >
                  Cancelar
                </button>
                <button type="submit" className="bg-green-600 text-white px-4 py-1 rounded">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editarId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">Editar repisa</h2>
            <div className="mb-4">
              <label className="block mb-1">Letra (máx. 10 letras):</label>
              <input
                type="text"
                maxLength={10}
                pattern="[A-Za-z]{1,10}"
                required
                placeholder="Ej: A, REPISA01"
                value={editarLetra}
                onChange={(e) => setEditarLetra(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase())}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block mb-1">Cantidad de estantes:</label>
              <input
                type="number"
                min={1}
                value={nuevaCantidad}
                onChange={(e) => setNuevaCantidad(e.target.value)}
                className={`w-full border rounded p-2 ${errorEdicion ? "border-red-500" : ""}`}
              />
              {errorEdicion && <span className="text-red-500 text-sm">{errorEdicion}</span>}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditarId(null)}
                className="bg-gray-300 px-3 py-1 rounded flex items-center gap-1"
              >
                <XMarkIcon className="w-5 h-5" />
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEdicion}
                className="bg-green-600 text-white px-4 py-1 rounded flex items-center gap-1"
              >
                <CheckIcon className="w-5 h-5" />
                Guardar
              </button>
            </div>
            {letraOriginal !== editarLetra && productosAsociados > 0 && (
              <div className="mt-4 text-yellow-700 bg-yellow-100 rounded p-2 text-sm flex items-center gap-2">
                <span className="font-bold">Advertencia:</span>
                Hay {productosAsociados} producto(s) asociados a esta repisa. Cambiar la letra puede afectar la referencia de ubicación de estos productos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {confirmarEliminarId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">¿Eliminar repisa?</h2>
            <p>¿Estás seguro que deseas eliminar esta repisa? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmarEliminarId(null)}
                className="bg-gray-300 px-3 py-1 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminarRepisa(confirmarEliminarId)}
                className="bg-red-600 text-white px-4 py-1 rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTAR EXCEL */}
      <details className="group border border-gray-300 rounded-lg p-4">
        <summary className="flex items-center gap-2 cursor-pointer font-medium">
          <ChevronDown className="w-5 h-5" />
          Importar desde Excel
        </summary>

        <div className="mt-4 space-y-4">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setArchivoExcel(e.target.files[0])}
            className="block w-full"
          />
          <button onClick={handleExcelUpload} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Importar Excel
          </button>
        </div>
      </details>
    </div>
  );
}
