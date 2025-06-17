import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ToastProvider } from './context/ToastContext.jsx';
import Toast from './components/Toast.jsx'; // ✅ necesario

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
      <Toast /> {/* ✅ este componente muestra los toasts en pantalla */}
    </ToastProvider>
  </React.StrictMode>
);
