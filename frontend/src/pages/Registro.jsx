// src/pages/Registro.jsx
import { useEffect, useState } from 'react'
import { api } from '../api';
import { ArrowDownCircle, ArrowUpCircle, XCircle } from 'lucide-react'

export default function Registro() {
  const [registros, setRegistros] = useState([])
  const [highlighted, setHighlighted] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/logs')
        setRegistros(res.data)
      } catch (err) {
        console.error('Error al cargar registros:', err)
      }
    }
    fetchData()
  }, [])

  const deshacerMovimiento = async (id) => {
    if (!window.confirm('¿Estás seguro que deseas deshacer este movimiento?')) return
    try {
      await api.post(`/logs/undo/${id}`)
      const res = await api.get('/logs')
      setRegistros(res.data)
      setHighlighted(id)
      setTimeout(() => setHighlighted(null), 3000)
    } catch (err) {
      console.error('Error al deshacer movimiento:', err)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Historial de movimientos</h2>
      <div className="grid gap-4">
        {registros.map((reg) => (
          <div
            key={reg.id}
            className={`p-4 border rounded shadow-sm flex justify-between items-center transition-colors duration-300 ${highlighted === reg.id ? 'bg-yellow-100' : 'bg-white'}`}
          >
            <div>
              <p className="font-semibold">{reg.descripcion}</p>
              <p className="text-sm text-gray-600">Marca: {reg.marca} | Cantidad: {reg.cantidad} {reg.unidad}</p>
              <p className="text-sm">{new Date(reg.fecha).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-4">
              {reg.tipo === 'ingreso' && <ArrowDownCircle className="text-green-600" size={24} />}
              {reg.tipo === 'egreso' && <ArrowUpCircle className="text-red-600" size={24} />}
              {reg.tipo === 'anulado' && <XCircle className="text-gray-500" size={24} />}
              {reg.tipo !== 'anulado' && (
                <button onClick={() => deshacerMovimiento(reg.id)} className="text-sm text-blue-600 hover:underline">
                  Deshacer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
