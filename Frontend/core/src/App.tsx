// =================================================================
// ARCHIVO 2: /src/App.tsx (ACTUALIZADO)
// Propósito: Usar el nuevo hook para gestionar la conexión WebSocket.
// =================================================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {type  RootState } from './app/store';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/admin/AdminDashboard';
import WaiterDashboard from './features/waiter/WaiterDashboard';
import CashierDashboard from './features/cashier/CashierDashboard';
import CashierOrderSearchPage from './features/cashier/CashierOrderSearchPage';
import CashierWaiterSearchPage from './features/cashier/CashierWaiterSearchPage';
import CashierInvoiceHistoryPage from './features/cashier/components/cashierDashboardMobile/pages/CashierInvoiceHistoryPage';
import CashierMetricsPage from './features/cashier/components/cashierDashboardMobile/pages/CashierMetricsPage';
import type { User } from './types/auth';
import { useWebSockets } from './hooks/useWebSockets'; // <-- 1. IMPORTAR EL HOOK

// Componente para gestionar la conexión WebSocket global
const WebSocketManager: React.FC = () => {
  useWebSockets(); // <-- 2. USAR EL HOOK
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

const CashierRoute: React.FC<{ user: User | null }> = ({ user }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'cajero') return <Navigate to="/dashboard" replace />;
  return <CashierOrderSearchPage />;
};

const CashierWaiterRoute: React.FC<{ user: User | null }> = ({ user }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'cajero') return <Navigate to="/dashboard" replace />;
  return <CashierWaiterSearchPage />;
};

const CashierHistoryRoute: React.FC<{ user: User | null }> = ({ user }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'cajero') return <Navigate to="/dashboard" replace />;
  return <CashierInvoiceHistoryPage />;
};

const CashierMetricsRoute: React.FC<{ user: User | null }> = ({ user }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'cajero') return <Navigate to="/dashboard" replace />;
  return <CashierMetricsPage />;
};

const App: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Router>
      {/* 3. Activa el gestor de WebSockets solo si hay un usuario logueado */}
      {user && <WebSocketManager />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute user={user} />} />
        <Route path="/cashier/search/:orderId" element={<CashierRoute user={user} />} />
        <Route path="/cashier/search/waiter/:waiterName" element={<CashierWaiterRoute user={user} />} />
        <Route path="/cashier/history" element={<CashierHistoryRoute user={user} />} />
        <Route path="/cashier/metrics" element={<CashierMetricsRoute user={user} />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
