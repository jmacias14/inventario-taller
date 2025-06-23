import { useEffect, useState } from 'react'
import InputMask from 'react-input-mask'
import { api } from '../api'
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function Registro() {
  const [registros, setRegistros] = useState([])
  const [selected, setSelected] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFromInput, setDateFromInput] = useState('')  // dd/mm/yyyy
  const [dateToInput, setDateToInput] = useState('')      // dd/mm/yyyy
  const [filterStart, setFilterStart] = useState('')      // ISO yyyy-mm-dd
  const [filterEnd, setFilterEnd] = useState('')          // ISO yyyy-mm-dd
  const { showToast } = useToast()

  // Función para obtener los datos de registro con paginación y filtro de fechas
  const fetchData = async (page = 1) => {
    try {
      let url = `/logs?page=${page}&limit=50`
      if (filterStart) url += `&startDate=${filterStart}`
      if (filterEnd)   url += `&endDate=${filterEnd}`

      const res = await api.get(url)
      setRegistros(res.data.data)
      setTotalPages(res.data.totalPages)
      setPageInput(page)
    } catch (err) {
      console.error('Error al cargar registros:', err)
      showToast('Error al cargar movimientos', 'error')
    }
  }

  // Efecto que se dispara al cambiar la página o filtros
  useEffect(() => {
    fetchData(currentPage)
  }, [currentPage, filterStart, filterEnd])

  // Handler para saltar a página específica
  const goToPage = () => {
    const p = Number(pageInput)
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p)
    } else {
      showToast('Página inválida', 'error')
      setPageInput(currentPage)
    }
  }

  // Handler para aplicar el filtro de fechas
  const handleFilter = () => {
    const re = /^\d{2}\/\d{2}\/\d{4}$/
    if (!re.test(dateFromInput) || !re.test(dateToInput)) {
      showToast('Formato de fecha inválido (usa dd/mm/yyyy)', 'error')
      return
    }
    const [dfD, dfM, dfY] = dateFromInput.split('/')
    const [dtD, dtM, dtY] = dateToInput.split('/')
    const isoFrom = `${dfY}-${dfM}-${dfD}`
    const isoTo   = `${dtY}-${dtM}-${dtD}`

    setFilterStart(isoFrom)
    setFilterEnd(isoTo)
    setCurrentPage(1)
  }

  // Handler para reiniciar filtros
  const handleReset = () => {
    setDateFromInput('')
    setDateToInput('')
    setFilterStart('')
    setFilterEnd('')
    setCurrentPage(1)
    showToast('Filtros reiniciados', 'success')
  }

  // Formateo de ubicación
  const formatearUbicacion = (prod) => {
    if (prod.repisa && prod.estante) {
      return `${prod.repisa.letra}-${prod.estante.numero}`
    }
    return prod.ubicacionLibre || 'Sin ubicación'
  }

  return (
    <div>
      {/* Filtro de fechas con máscara */}
      <div className="flex items-center space-x-2 mb-4 justify-center">
        <InputMask
          mask="99/99/9999"
          value={dateFromInput}
          onChange={(e) => setDateFromInput(e.target.value)}
        >
          {(inputProps) => (
            <input
              {...inputProps}
              type="text"
              placeholder="dd/mm/yyyy"
              className="w-32 text-center border border-gray-200 rounded-md px-2 py-1 text-sm focus:ring-0 focus:border-gray-300"
            />
          )}
        </InputMask>
        <span className="text-sm">a</span>
        <InputMask
          mask="99/99/9999"
          value={dateToInput}
          onChange={(e) => setDateToInput(e.target.value)}
        >
          {(inputProps) => (
            <input
              {...inputProps}
              type="text"
              placeholder="dd/mm/yyyy"
              className="w-32 text-center border border-gray-200 rounded-md px-2 py-1 text-sm focus:ring-0 focus:border-gray-300"
            />
          )}
        </InputMask>
        <button
          onClick={handleFilter}
          className="ml-2 inline-flex items-center px-3 py-1.5 text-sm font-medium bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200"
        >
          Filtrar
        </button>
        { (filterStart || filterEnd) && (
          <button
            onClick={handleReset}
            className="ml-2 inline-flex items-center px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-100"
          >
            Reiniciar filtro
          </button>
        ) }
      </div>

      <h2 className="text-xl font-bold mb-4">Historial de movimientos</h2>
      <div className="grid gap-4">
        {registros.map((reg) => {
          const color =
            reg.tipo === 'ingreso' ? 'border-green-500' :
            reg.tipo === 'egreso' ? 'border-red-500' : 'border-gray-300'
          const icon =
            reg.tipo === 'ingreso' ? <ArrowDownCircle className="text-green-600" size={20} /> :
            <ArrowUpCircle className="text-red-600" size={20} />

          return (
            <div
              key={reg.id}
              onClick={() => setSelected(reg)}
              className={`cursor-pointer p-4 border-l-4 ${color} border rounded-lg shadow-sm transition hover:bg-gray-50`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">SKU: {reg.producto.sku}</p>
                  <p className="font-semibold">{reg.producto.descripcion}</p>
                  <p className="text-sm text-gray-600">
                    {reg.cantidad} {reg.producto.unidad}
                  </p>
                </div>
                <div>{icon}</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{new Date(reg.fecha).toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      {/* Paginación con flechas y campo de página */}
      <div className="flex items-center justify-center mt-4 space-x-2">
        <button
          onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronLeft size={20} />
        </button>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && goToPage()}
          className="w-16 text-center border border-gray-200 rounded-md px-2 py-1 text-sm focus:ring-0 focus:border-gray-300"
        />
        <span className="text-sm text-gray-600">de {totalPages}</span>
        <button
          onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-2">Detalle del movimiento</h3>
            <ul className="text-sm space-y-1">
              <li><strong>Tipo:</strong> {selected.tipo}</li>
              <li><strong>SKU:</strong> {selected.producto.sku}</li>
              <li><strong>Descripción:</strong> {selected.producto.descripcion}</li>
              <li><strong>Marca:</strong> {selected.producto.marca}</li>
              <li><strong>Unidad:</strong> {selected.producto.unidad}</li>
              <li><strong>Cantidad:</strong> {selected.cantidad}</li>
              <li><strong>Ubicación:</strong> {formatearUbicacion(selected.producto)}</li>
              {selected.observaciones && (
                <li><strong>Observaciones:</strong> {selected.observaciones}</li>
              )}
              <li><strong>Fecha:</strong> {new Date(selected.fecha).toLocaleString()}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
)
}
