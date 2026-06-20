// =================================================================
// ARCHIVO 2: /src/App.tsx (ACTUALIZADO)
// Propósito: Usar el nuevo hook para gestionar la conexión WebSocket.
// =================================================================
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { type RootState } from './app/store';
import { settingsAPI } from './features/settings/api/settingsAPI';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/admin/AdminDashboard';
import WaiterDashboard from './features/waiter/WaiterDashboard';
import CashierDashboard from './features/cashier/CashierDashboard';
import type { User } from './types/auth';
import { useWebSockets } from './hooks/useWebSockets'; // <-- 1. IMPORTAR EL HOOK

import CashierOrderSearchPage from './features/cashier/CashierOrderSearchPage';
import CashierWaiterSearchPage from './features/cashier/CashierWaiterSearchPage';
import CashierMetricsPage from './features/cashier/components/cashierDashboardMobile/pages/CashierMetricsPage';
import CashierInvoiceHistoryPage from './features/cashier/components/cashierDashboardMobile/pages/CashierInvoiceHistoryPage';

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

const ProtectedRoute: React.FC<{ user: User | null; children?: React.ReactNode }> = ({ user, children }) => {
  if (!user) { return <Navigate to="/login" replace />; }
  return children ? <>{children}</> : <DashboardRedirect user={user} />;
};

const App: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const fetchAndApplySettings = async () => {
    try {
      const settings = await settingsAPI.getSettings();
      const logoSetting = settings.find(s => s.key === 'logo');
      const nameSetting = settings.find(s => s.key === 'app_name');

      if (nameSetting && nameSetting.value) {
        document.title = nameSetting.value;
      }
      if (logoSetting && logoSetting.value) {
        let logoUrl = logoSetting.value;
        if (!logoUrl.startsWith('http')) {
          const API_URL = import.meta.env.VITE_API_URL || '/api';
          const base = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
          logoUrl = logoUrl.startsWith('/uploads/') ? logoUrl.replace('/uploads/', '/api/static/') : logoUrl;
          logoUrl = `${base.replace('/api', '')}${logoUrl}`;
        }
        
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = `${logoUrl}?v=${new Date().getTime()}`;
      }
    } catch (err) {
      console.error("Error loading logo for favicon:", err);
    }
  };

  useEffect(() => {
    // Configurar settings globales
    fetchAndApplySettings();
    window.addEventListener('app-logo-updated', fetchAndApplySettings);
    window.addEventListener('app-name-updated', fetchAndApplySettings);
    return () => {
      window.removeEventListener('app-logo-updated', fetchAndApplySettings);
      window.removeEventListener('app-name-updated', fetchAndApplySettings);
    };
  }, []);

  return (
    <Router>
      {/* 3. Activa el gestor de WebSockets solo si hay un usuario logueado */}
      {user && <WebSocketManager />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute user={user} />} />
        <Route path="/cashier/search/:orderId" element={<ProtectedRoute user={user}><CashierOrderSearchPage /></ProtectedRoute>} />
        <Route path="/cashier/search/waiter/:waiterName" element={<ProtectedRoute user={user}><CashierWaiterSearchPage /></ProtectedRoute>} />
        <Route path="/cashier/history" element={<ProtectedRoute user={user}><CashierInvoiceHistoryPage /></ProtectedRoute>} />
        <Route path="/cashier/metrics" element={<ProtectedRoute user={user}><CashierMetricsPage /></ProtectedRoute>} />
        <Route path="/cashier/take-order" element={<ProtectedRoute user={user}><WaiterDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
