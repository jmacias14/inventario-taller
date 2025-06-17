import { useState, useEffect } from "react";
import { api } from "../api.js";
import { ChevronDown, ChevronUp, X, FileText } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [ventaAAnular, setVentaAAnular] = useState(null);
  const [modalRemito, setModalRemito] = useState(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [observacionEditable, setObservacionEditable] = useState("");
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const fetchVentas = async () => {
    try {
      const res = await api.get("/ventas/history");
      setVentas(res.data);
    } catch (err) {
      console.error(err);
      setError("Error al obtener el historial de ventas.");
    }
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  const toggleDetalle = (id) => {
    setVentaSeleccionada((prev) => (prev === id ? null : id));
  };

  const confirmarAnularVenta = async () => {
    if (!ventaAAnular) return;
    try {
      await api.delete(`/ventas/${ventaAAnular.id}`);
      await fetchVentas();
      setVentaAAnular(null);
      showToast("Venta anulada y stock restaurado correctamente.", "success");
    } catch (err) {
      console.error(err);
      setVentaAAnular(null);
      showToast("Error al anular la venta.", "error");
    }
  };

  const pluralizar = (unidad, cantidad) => {
    if (unidad === "Unidad") return cantidad === 1 ? "Unidad" : "Unidades";
    return cantidad === 1 ? unidad : unidad + "s";
  };

  const generarRemitoPDF = async () => {
    if (!modalRemito) return;
    try {
      const url = "/remito.pdf";
      const plantillaBytes = await fetch(url).then((res) => res.arrayBuffer());
      const fuenteBytes = await fetch("/montserrat.ttf").then((res) => res.arrayBuffer());
      const venta = modalRemito;

      const detalleFields = [
        'Text36', 'Text35', 'Text34', 'Text33', 'Text32', 'Text31', 'Text30', 'Text29',
        'Text28', 'Text24', 'Text22', 'Text27', 'Text23', 'Text25', 'Text26'
      ];
      const cantidadFields = [
        'Text37', 'Text38', 'Text39', 'Text40', 'Text41', 'Text42', 'Text43', 'Text44',
        'Text45', 'Text46', 'Text47', 'Text48', 'Text49', 'Text50', 'Text51'
      ];

      const partes = [];
      for (let i = 0; i < venta.productos.length; i += 15) {
        const chunk = venta.productos.slice(i, i + 15);
        const pdfDoc = await PDFDocument.load(plantillaBytes);
        pdfDoc.registerFontkit(fontkit);
        await pdfDoc.embedFont(fuenteBytes); // embebido para mantener consistencia
        const form = pdfDoc.getForm();

        const setTexto = (nombre, texto) => {
          try {
            const field = form.getTextField(nombre);
            const textoSeguro =
              nombre === "Text3"
                ? texto?.toString() || ""
                : texto?.toString().substring(0, 90) || "";
            field.setText(textoSeguro);
          } catch (e) {
            console.warn(`Falló setText en ${nombre}`, e);
          }
        };

        const fecha = new Date();
        setTexto("Text1", nombreCliente);
        setTexto("Text2", direccionCliente);
        setTexto("Text3", observacionEditable);
        setTexto("Text4", fecha.getDate().toString().padStart(2, "0"));
        setTexto("Text52", (fecha.getMonth() + 1).toString().padStart(2, "0"));
        setTexto("Text53", fecha.getFullYear().toString());
        setTexto("Text5", `#${venta.id}`);

        for (let j = 0; j < 15; j++) {
          const producto = chunk[j];
          const detalle = detalleFields[j];
          const cantidad = cantidadFields[j];
          if (producto) {
            setTexto(cantidad, String(producto.cantidad));
            setTexto(detalle, `${producto.sku || "—"} - ${producto.descripcion}`);
          } else {
            try {
              form.getTextField(cantidad).setText("");
              form.getTextField(detalle).setText("");
            } catch (e) {
              console.warn(`Falló limpieza de campo ${cantidad} o ${detalle}`, e);
            }
          }
        }

        form.flatten();
        partes.push(await pdfDoc.save());
      }

      const finalDoc = await PDFDocument.create();
      for (const parteBytes of partes) {
        const tempDoc = await PDFDocument.load(parteBytes);
        const [copiedPage] = await finalDoc.copyPages(tempDoc, [0]);
        finalDoc.addPage(copiedPage);
      }

      const finalBytes = await finalDoc.save();
      const blob = new Blob([finalBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `remito_venta_${venta.id}.pdf`;
      link.click();

      setModalRemito(null);
      showToast("Remito generado correctamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al generar remito", "error");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Historial de Ventas</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="space-y-4">
        {ventas.map((venta) => (
          <div key={venta.id} className="border rounded-lg shadow-sm p-4 bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleDetalle(venta.id)} className="p-1 rounded hover:bg-gray-100">
                  {ventaSeleccionada === venta.id ? (
                    <ChevronUp className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-blue-600" />
                  )}
                </button>
                <div>
                  <p className="font-semibold">
                    Venta #{venta.id} – {new Date(venta.fecha).toLocaleDateString("es-AR")}{" "}
                    {new Date(venta.fecha).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-sm text-gray-600">{venta.comentarios}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    setNombreCliente("");
                    setDireccionCliente("");
                    setObservacionEditable(venta.comentarios || "");
                    setModalRemito(venta);
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Generar Remito
                </button>
                <button
                  onClick={() => setVentaAAnular(venta)}
                  className="text-red-600 p-2 rounded hover:bg-red-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {ventaSeleccionada === venta.id && (
              <div className="mt-3 text-sm">
                <ul className="divide-y">
                  {venta.productos.map((producto, i) => (
                    <li
                      key={i}
                      className="py-2 px-1 cursor-pointer hover:bg-gray-50 rounded flex justify-between items-center transition"
                      onClick={() => setProductoSeleccionado(producto)}
                    >
                      <span>
                        {producto.descripcion} –{" "}
                        <span className="text-gray-500">SKU: {producto.sku || "—"}</span> –{" "}
                        {producto.cantidad} {pluralizar(producto.unidad, producto.cantidad)}
                      </span>
                      <span className="text-blue-500 hover:underline ml-2 text-xs">Ver detalles</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-lg font-bold mb-2">Detalle del producto</h2>
            <p><strong>Descripción:</strong> {productoSeleccionado.descripcion}</p>
            <p><strong>Marca:</strong> {productoSeleccionado.marca}</p>
            <p><strong>SKU:</strong> {productoSeleccionado.sku || "—"}</p>
            <p><strong>Ubicación:</strong>{" "}
              {productoSeleccionado.ubicacionLibre ||
                `${productoSeleccionado.repisa?.letra || ""} ${productoSeleccionado.estante?.numero || ""}`}
            </p>
            <p><strong>Cantidad:</strong> {productoSeleccionado.cantidad}{" "}
              {pluralizar(productoSeleccionado.unidad, productoSeleccionado.cantidad)}
            </p>
            <p><strong>Unidad:</strong> {productoSeleccionado.unidad}</p>
            <p><strong>Observaciones:</strong> {productoSeleccionado.observaciones || "—"}</p>
            <button
              onClick={() => setProductoSeleccionado(null)}
              className="mt-4 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {modalRemito && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Generar Remito</h2>
            <div className="mb-2">
              <label className="block text-sm font-medium">Nombre:</label>
              <input type="text" className="w-full border rounded px-3 py-1"
                value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium">Dirección:</label>
              <input type="text" className="w-full border rounded px-3 py-1"
                value={direccionCliente} onChange={(e) => setDireccionCliente(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium">Observación:</label>
              <textarea className="w-full border rounded px-3 py-1" rows={2}
                value={observacionEditable} onChange={(e) => setObservacionEditable(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalRemito(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
              <button onClick={generarRemitoPDF} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Generar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
