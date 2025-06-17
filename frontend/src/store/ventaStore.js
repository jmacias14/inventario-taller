import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useVentaStore = create(persist(
  (set, get) => ({
    venta: [],
    agregarProducto: (producto) => {
      const existe = get().venta.find(p => p.id === producto.id)
      if (existe) {
        set(state => ({
          venta: state.venta.map(p =>
            p.id === producto.id
              ? { ...p, cantidadSeleccionada: (p.cantidadSeleccionada || 0) + (producto.cantidadSeleccionada || 1) }
              : p
          )
        }))
      } else {
        set(state => ({
          venta: [...state.venta, { ...producto, cantidadSeleccionada: producto.cantidadSeleccionada || 1 }]
        }))
      }
    },
    quitarProducto: (id) => {
      set(state => ({ venta: state.venta.filter(p => p.id !== id) }))
    },
    reiniciarVenta: () => set({ venta: [] }),
    finalizarVenta: () => set({ venta: [] })
  }),
  {
    name: 'venta-storage'
  }
))
