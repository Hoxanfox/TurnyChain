// =================================================================
// ARCHIVO 8: /src/App.tsx (ACTUALIZADO)
// Propósito: Reemplazar el placeholder con el componente real 'AdminDashboard'.
// =================================================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from './app/store';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/users/AdminDashboard'; // <-- 1. IMPORTAR EL REAL
import type { User } from './types/auth';

// --- Componentes de Dashboard (Placeholders) ---
const CashierDashboard = () => <div className="p-4"><h1>Panel de Cajero</h1></div>;
const WaiterDashboard = () => <div className="p-4"><h1>Panel de Mesero</h1></div>;

const DashboardRedirect: React.FC<{ user: User | null }> = ({ user }) => {
  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />; // <-- 2. USAR EL REAL
    case 'cajero':
      return <CashierDashboard />;
    case 'mesero':
      return <WaiterDashboard />;
    default:
      return <Navigate to="/login" />;
  }
};

// El resto del archivo App.tsx no necesita cambios...
const ProtectedRoute: React.FC<{ user: User | null }> = ({ user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardRedirect user={user} />;
};

const App: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute user={user} />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
