// =================================================================
// ARCHIVO 7: /src/App.tsx (ACTUALIZADO)
// =================================================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from './app/store';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/admin/AdminDashboard';
import WaiterDashboard from './features/waiter/WaiterDashboard';
import CashierDashboard from './features/cashier/CashierDashboard';
import type { User } from './types/auth';
import { useWebSockets } from './hooks/useWebSockets';

// Componente para gestionar la conexión WebSocket global
const WebSocketManager: React.FC = () => {
  useWebSockets();
  return null; // Este componente no renderiza nada
};

const DashboardRedirect: React.FC<{ user: User | null }> = ({ user }) => {
  switch (user?.role) {
    case 'admin': return <AdminDashboard />;
    case 'cajero': return <CashierDashboard />;
    case 'mesero': return <WaiterDashboard />;
    default: return <Navigate to="/login" />;
  }
};

const ProtectedRoute: React.FC<{ user: User | null }> = ({ user }) => {
  if (!user) { return <Navigate to="/login" replace />; }
  return <DashboardRedirect user={user} />;
};

const App: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Router>
      {user && <WebSocketManager />} {/* Activa los WebSockets solo si hay un usuario logueado */}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute user={user} />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;