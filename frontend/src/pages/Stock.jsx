import { useEffect, useState, useCallback } from 'react'
import { api } from "../api.js"
import { useVentaStore } from '../store/ventaStore'
import { useToast } from '../context/ToastContext'
import { Search, ChevronRight, ChevronUp, Trash2, Plus, ShoppingCart } from 'lucide-react'

// Función utilitaria para pluralizar unidades
const pluralizarUnidad = (unidad, cantidad) => {
  if (unidad === 'Unidad') return cantidad === 1 ? 'Unidad' : 'Unidades'
  if (unidad === 'Litro') return cantidad === 1 ? 'Litro' : 'Litros'
  return unidad
}

// Función debounce para optimizar búsquedas
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export default function Stock() {
  // Estados principales
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Estados de filtros y paginación
  const [query, setQuery] = useState('')
  const [cantidadFiltro, setCantidadFiltro] = useState('')
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  // Estados de estructura y UI
  const [estructuraRaw, setEstructuraRaw] = useState([])
  const [estructura, setEstructura] = useState([])
  const [expandido, setExpandido] = useState(null)

  // Estados de modales
  const [modal, setModal] = useState(null)
  const [cantidadVenta, setCantidadVenta] = useState(1)
  const [confirmarEliminarId, setConfirmarEliminarId] = useState(null)
  const [productoEditar, setProductoEditar] = useState(null)
  const [formEditar, setFormEditar] = useState({})
  const [erroresEditar, setErroresEditar] = useState({})
  const [confirmarStockMenor, setConfirmarStockMenor] = useState(false)
  // NUEVO: confirmación doble de borrado en cascada
  const [requiereBorradoForzado, setRequiereBorradoForzado] = useState(false)
  const [productoForzadoId, setProductoForzadoId] = useState(null)

  const { agregarProducto } = useVentaStore()
  const { showToast } = useToast()
  const LIMITE = 50

  // Cargar estructura inicial con IDs
  useEffect(() => {
    api.get('/estructura')
      .then(res => {
        setEstructuraRaw(res.data)
        setEstructura(res.data)
      })
      .catch(() => showToast('Error al cargar estructura de ubicación', 'error'))
  }, [showToast])

  // Función para obtener productos
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (query) params.append('query', query)
      if (cantidadFiltro) params.append('maxCantidad', cantidadFiltro)
      params.append('skip', (pagina - 1) * LIMITE)
      params.append('take', LIMITE)

      const res = await api.get(`/products?${params.toString()}`)
      const productosData = Array.isArray(res.data) ? res.data : res.data.productos
      setProductos(productosData || [])
      setTotalPaginas(Math.max(1, Math.ceil((res.data.total || productosData.length) / LIMITE)))
    } catch (err) {
      setError('Error al obtener productos del servidor')
      showToast('Error al obtener productos del servidor', 'error')
      setProductos([])
      setTotalPaginas(1)
    } finally {
      setLoading(false)
    }
  }, [query, cantidadFiltro, pagina, showToast])

  // Búsqueda con debounce
  const debouncedSearch = useCallback(
    debounce(() => {
      setPagina(1)
      fetchProductos()
    }, 300),
    [fetchProductos]
  )

  useEffect(() => {
    fetchProductos()
  }, [pagina])

  useEffect(() => {
    if (query || cantidadFiltro) {
      debouncedSearch()
    } else {
      fetchProductos()
    }
  }, [query, cantidadFiltro, debouncedSearch, fetchProductos])

  // Modal de venta
  const abrirModalVenta = (producto) => {
    setModal(producto)
    setCantidadVenta(1)
  }

  const confirmarAgregarVenta = () => {
    const cantidad = Number.isNaN(cantidadVenta) ? 1 : cantidadVenta
    if (cantidad > 0 && cantidad <= modal.cantidad) {
      agregarProducto({ ...modal, cantidadSeleccionada: cantidadVenta })
      setModal(null)
      showToast('Producto agregado a la venta', 'success')
    } else {
      showToast('Cantidad inválida', 'error')
    }
  }

  // Edición
  const abrirModalEditar = (producto) => {
    const tipoUbicacion = producto.tipoUbicacion || (producto.ubicacionLibre ? 'otro' : 'repisa')
    setFormEditar({
      ...producto,
      tipoUbicacion,
      repisaId: producto.repisa?.id || null,
      repisaLetra: producto.repisa?.letra || '',
      estanteId: producto.estante?.id || null,
      estanteNumero: producto.estante?.numero || '',
      ubicacionLibre: producto.ubicacionLibre || ''
    })
    setProductoEditar(producto)
    setErroresEditar({})
    setConfirmarStockMenor(false)
  }

  const handleTipoUbicacionChange = (tipo) => {
    setFormEditar(prev => ({
      ...prev,
      tipoUbicacion: tipo,
      repisaId: null,
      repisaLetra: '',
      estanteId: null,
      estanteNumero: '',
      ubicacionLibre: ''
    }))
  }

  const validarFormularioEditar = async () => {
    const camposObligatorios = ['sku', 'marca', 'descripcion', 'cantidad', 'unidad']
    const nuevosErrores = {}

    camposObligatorios.forEach(campo => {
      if (!formEditar[campo] || String(formEditar[campo]).trim() === '') {
        nuevosErrores[campo] = true
      }
    })

    if (formEditar.sku !== productoEditar.sku) {
      try {
        const res = await api.get(`/products/sku/${formEditar.sku}`)
        if (res.data) nuevosErrores.sku = 'SKU ya existente'
      } catch { }
    }

    setErroresEditar(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const confirmarEdicionProducto = async () => {
    const esValido = await validarFormularioEditar()
    if (!esValido) return showToast('Corrige los errores antes de continuar', 'error')

    const cantidadOriginal = productoEditar.cantidad
    const nuevaCantidad = parseFloat(formEditar.cantidad)

    if (!confirmarStockMenor && nuevaCantidad < cantidadOriginal) {
      setConfirmarStockMenor(true)
      return showToast('Estas eliminando productos del stock. Confirma nuevamente.', 'warning')
    }

    try {
      const dataFinal = {
        ...formEditar,
        cantidad: parseFloat(formEditar.cantidad),
        repisaId: formEditar.tipoUbicacion === 'repisa' ? formEditar.repisaId : null,
        estanteId: formEditar.tipoUbicacion === 'repisa' ? formEditar.estanteId : null,
        ubicacionLibre: formEditar.tipoUbicacion === 'otro' ? formEditar.ubicacionLibre : null,
      }

      await api.put(`/products/${productoEditar.id}`, dataFinal)
      showToast('Producto actualizado correctamente', 'success')
      setProductoEditar(null)
      fetchProductos()
    } catch {
      showToast('Error al guardar cambios', 'error')
    }
  }

  // Función de eliminación con soporte borrado en cascada
  const confirmarEliminarProducto = async () => {
    try {
      await api.delete(`/products/${confirmarEliminarId}`)
      showToast('Producto eliminado correctamente', 'success')
      setConfirmarEliminarId(null)
      fetchProductos()
    } catch (err) {
      if (err.response && err.response.status === 409 && err.response.data && err.response.data.necesitaConfirmacion) {
        setRequiereBorradoForzado(true)
        setProductoForzadoId(confirmarEliminarId)
      } else {
        showToast('Error al eliminar producto', 'error')
      }
    }
  }

  const confirmarEliminarForzado = async () => {
    try {
      await api.delete(`/products/${productoForzadoId}?force=true`)
      showToast('Producto y relaciones eliminadas correctamente', 'success')
      setProductoForzadoId(null)
      setRequiereBorradoForzado(false)
      setConfirmarEliminarId(null)
      fetchProductos()
    } catch {
      showToast('Error al eliminar producto y sus relaciones', 'error')
    }
  }

  // Componente para mostrar errores
  if (error && !loading) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchProductos}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros mejorados */}
      <div className="mb-4 relative max-w-2xl mx-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por código, marca o descripción"
            className="block w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/50 transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar productos"
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
        </div>

        <div className="mt-4 w-1/2">
          <label htmlFor="cantidad-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filtrar por cantidad (menor o igual a):
          </label>
          <input
            id="cantidad-filter"
            type="number"
            placeholder="Cantidad máxima"
            className="block w-full rounded-lg border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500/50 transition-colors"
            value={cantidadFiltro}
            onChange={(e) => setCantidadFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando productos...</p>
        </div>
      )}

      {/* Lista de productos */}
      {!loading && (
        <div className="grid gap-4">
          {productos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron productos
            </div>
          ) : (
            productos.map(prod => (
              <div
                key={prod.id}
                className={`p-4 border rounded bg-white shadow-sm transition-colors ${
                  prod.cantidad <= 1 ? 'bg-red-50 border-red-200' : 'hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded flex-1 transition-colors"
                    onClick={() => setExpandido(expandido === prod.id ? null : prod.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpandido(expandido === prod.id ? null : prod.id)
                      }
                    }}
                    aria-expanded={expandido === prod.id}
                    aria-label={`${expandido === prod.id ? 'Contraer' : 'Expandir'} detalles de ${prod.descripcion}`}
                  >
                    <div className="flex items-center justify-center h-full">
                      {expandido === prod.id ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{prod.descripcion}</h3>
                      <p className="text-sm text-gray-600">Marca: {prod.marca}</p>
                      <p className="text-sm text-gray-600">
                        Ubicación: {prod.ubicacionLibre || `${prod.repisa?.letra || ''} ${prod.estante?.numero || ''}`}
                      </p>
                      {prod.cantidad <= 1 && (
                        <p className="text-sm font-medium text-red-600">⚠️ Stock bajo</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => abrirModalVenta(prod)}
                    className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                    aria-label={`Agregar ${prod.descripcion} a la venta`}
                  >
                    <ShoppingCart size={16} className="inline mr-1" />
                    Agregar a Venta
                  </button>
                </div>

                {expandido === prod.id && (
                  <div className="mt-4 text-sm text-gray-700 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <p><strong>SKU:</strong> {prod.sku || '—'}</p>
                      <p><strong>Cantidad:</strong> {prod.cantidad} {pluralizarUnidad(prod.unidad, prod.cantidad)}</p>
                    </div>
                    <p><strong>Observaciones:</strong> {prod.observaciones || '—'}</p>
                    <p><strong>Última actualización:</strong> {new Date(prod.updatedAt).toLocaleString()}</p>

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => abrirModalEditar(prod)}
                        className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <Plus size={14} /> Editar producto
                      </button>
                      <button
                        onClick={() => setConfirmarEliminarId(prod.id)}
                        className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                      >
                        <Trash2 size={14} /> Borrar producto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Paginación mejorada */}
      {!loading && productos.length > 0 && (
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            disabled={pagina === 1}
            onClick={() => setPagina(p => p - 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:hover:bg-gray-200"
          >
            Anterior
          </button>
          <span className="font-medium">Página {pagina} de {totalPaginas}</span>
          <button
            disabled={pagina === totalPaginas}
            onClick={() => setPagina(p => p + 1)}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:hover:bg-gray-200"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmarEliminarId && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full" role="dialog" aria-labelledby="delete-title">
            <h2 id="delete-title" className="text-lg font-bold mb-4 text-gray-800">
              ¿Eliminar producto?
            </h2>
            <p className="text-sm text-gray-600 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmarEliminarId(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarProducto}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de advertencia de borrado en cascada */}
      {requiereBorradoForzado && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full" role="dialog" aria-labelledby="force-delete-title">
            <h2 id="force-delete-title" className="text-lg font-bold mb-4 text-gray-800">
              Confirmar borrado en cascada
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Este producto está relacionado con ventas o movimientos. Si continúas, <b>también se eliminarán todas las ventas y movimientos asociados</b>.<br /><br />
              ¿Estás seguro de que deseas continuar?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRequiereBorradoForzado(false)
                  setProductoForzadoId(null)
                  setConfirmarEliminarId(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarForzado}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Sí, eliminar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {productoEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold mb-4">Editar Producto</h3>
            <div className="space-y-3">
              {['sku','marca','descripcion','cantidad','unidad','observaciones'].map((campo) => (
                <div key={campo}>
                  <label className="text-sm font-medium capitalize block mb-1">
                    {campo}
                  </label>
                  <input
                    type={campo === 'cantidad' ? 'number' : 'text'}
                    value={formEditar[campo] || ''}
                    onChange={e => setFormEditar({ ...formEditar, [campo]: e.target.value })}
                    className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      erroresEditar[campo] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {erroresEditar[campo] && typeof erroresEditar[campo] === 'string' && (
                    <p className="text-xs text-red-600 mt-1">{erroresEditar[campo]}</p>
                  )}
                </div>
              ))}

              <div>
                <label className="text-sm font-medium block mb-1">Ubicación</label>
                <select
                  value={formEditar.tipoUbicacion}
                  onChange={e => handleTipoUbicacionChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="repisa">Repisa</option>
                  <option value="otro">Ubicación libre</option>
                </select>

                {formEditar.tipoUbicacion === 'repisa' && (
                  <>
                    <label className="text-sm block mb-1">Repisa</label>
                    <select
                      value={formEditar.repisaId}
                      onChange={e => setFormEditar(prev => ({ ...prev, repisaId: parseInt(e.target.value), estanteId: null }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Seleccionar repisa</option>
                      {estructura.map(r => (
                        <option key={r.letra} value={r.id}>{r.letra}</option>
                      ))}
                    </select>

                    <label className="text-sm block mb-1">Estante</label>
                    <select
                      value={formEditar.estanteId}
                      onChange={e => setFormEditar(prev => ({ ...prev, estanteId: parseInt(e.target.value) }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Seleccionar estante</option>
                      {estructura.find(r => r.id === formEditar.repisaId)?.estantes.map(est => (
                        <option key={est.id} value={est.id}>{est.numero}</option>
                      ))}
                    </select>
                  </>
                )}

                {formEditar.tipoUbicacion === 'otro' && (
                  <div className="mt-2">
                    <label className="text-sm block mb-1">Ubicación libre</label>
                    <input
                      type="text"
                      value={formEditar.ubicacionLibre || ''}
                      onChange={e => setFormEditar(prev => ({ ...prev, ubicacionLibre: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setProductoEditar(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEdicionProducto}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Aceptar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de agregar a venta */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" role="dialog" aria-labelledby="sale-title">
            <div>
              <h2 id="sale-title" className="text-xl font-bold text-gray-800">
                Agregar a venta
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                <strong>{modal.descripcion}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Stock disponible: {modal.cantidad} {modal.unidad}
              </p>
            </div>

            <div>
              <label htmlFor="cantidad-venta" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a vender:
              </label>
              <input
                id="cantidad-venta"
                type="number"
                min={1}
                max={modal.cantidad}
                value={cantidadVenta}
                onChange={e => setCantidadVenta(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAgregarVenta}
                disabled={cantidadVenta <= 0 || cantidadVenta > modal.cantidad}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
