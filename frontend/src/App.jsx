import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Stock from './pages/Stock';
import Ventas from './pages/Ventas';
import Registro from './pages/Registro';
import HistorialVentas from './pages/HistorialVentas';
import Configuracion from './pages/Configuracion';
import AgregarNuevoProducto from './pages/AgregarNuevoProducto';
import Toast from './components/Toast';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <Header />
          
          {/* Toast va aquí: fuera del main pero dentro del layout */}
          <Toast />

          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ingreso" element={<AgregarNuevoProducto />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/historial-ventas" element={<HistorialVentas />} />
              <Route path="/configuracion" element={<Configuracion />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
