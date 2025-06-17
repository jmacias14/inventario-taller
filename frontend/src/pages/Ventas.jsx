import { useEffect, useState } from 'react'
import { useVentaStore } from '../store/ventaStore'
import { api } from "../api.js";
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { ChevronRight, ChevronUp } from 'lucide-react'
import { useToast } from "../context/ToastContext"

export default function Ventas() {
  const { venta, quitarProducto, reiniciarVenta } = useVentaStore()
  const { showToast } = useToast()
  const [comentarios, setComentarios] = useState('')
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [mostrarConfirmacionReinicio, setMostrarConfirmacionReinicio] = useState(false)
  const [expandido, setExpandido] = useState([])

  const toggleExpandido = (id) => {
    setExpandido(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const handleConfirmarVenta = async () => {
    try {
      const productos = venta.map(p => ({
        productoId: p.id,
        cantidad: Number(p.cantidadSeleccionada || p.cantidad || 1)
      }))
      setMostrarConfirmacion(false)
      await api.post('/ventas', { comentarios, productos })  // Cambié /sales a /ventas
      reiniciarVenta()
      setComentarios('')
      showToast('Venta finalizada correctamente', 'success')
    } catch (err) {
      console.error(err)
      showToast('Error al finalizar la venta', 'error')
    }
  }

  const handleReiniciar = () => setMostrarConfirmacionReinicio(true)
  const handleFinalizar = () => setMostrarConfirmacion(true)
  const handleConfirmarReinicio = () => {
    reiniciarVenta()
    setComentarios('')
    setMostrarConfirmacionReinicio(false)
    showToast('Venta reiniciada', 'info')
  }

  const handleQuitarProducto = (id) => {
    quitarProducto(id)
    showToast('Producto eliminado de la venta', 'warning')
  }

  const pluralizar = (unidad, cantidad) => {
    if (unidad === 'Unidad') return cantidad === 1 ? 'Unidad' : 'Unidades'
    return cantidad === 1 ? unidad : unidad + 's'
  }

  return (
    <div>
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">¿Confirmar venta?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Esto actualizará el stock de los productos seleccionados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarVenta}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarConfirmacionReinicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">¿Reiniciar venta?</h2>
            <p className="text-sm text-gray-600 mb-6">
              Se perderán los productos agregados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarConfirmacionReinicio(false)}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarReinicio}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {venta.length === 0 ? (
        <p className="text-center text-xl text-gray-600 mt-10">No hay productos en la venta.</p>
      ) : (
        <div className="grid gap-4">
          {venta.map((prod, i) => (
            <div key={i} className="border rounded bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => toggleExpandido(prod.id)}
                  className="text-gray-600 hover:text-gray-800 mr-3"
                  title="Expandir"
                >
                  {expandido.includes(prod.id) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
                <div className="text-base font-medium flex-1">
                  {prod.descripcion} — {prod.cantidadSeleccionada || prod.cantidad || 1} {pluralizar(prod.unidad, prod.cantidadSeleccionada || prod.cantidad || 1)}
                </div>
                <div className="flex items-center gap-2">
                  
                  <button
                    onClick={() => handleQuitarProducto(prod.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Quitar"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {expandido.includes(prod.id) && (
                <div className="px-4 pb-4 text-sm text-gray-700 space-y-1">
                  <p><strong>Marca:</strong> {prod.marca}</p>
                  <p><strong>SKU:</strong> {prod.sku || '—'}</p>
                  <p><strong>Unidad:</strong> {prod.unidad}</p>
                  <p><strong>Ubicación:</strong> {prod.ubicacion}</p>
                  <p><strong>Observaciones:</strong> {prod.observaciones || '—'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {venta.length > 0 && (
        <div className="mt-6">
          <label className="block font-medium text-sm text-gray-700 mb-1">Comentarios:</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={3}
            placeholder="Comentarios sobre la venta..."
          />
        </div>
      )}

      <div className="mt-6 flex justify-center gap-4">
        <button
          onClick={handleFinalizar}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          disabled={venta.length === 0}
        >
          Finalizar venta
        </button>
        <button
          onClick={handleReiniciar}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          disabled={venta.length === 0}
        >
          Limpiar Venta
        </button>
      </div>
    </div>
  )
}
