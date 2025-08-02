// =================================================================
// ARCHIVO 6: /src/features/admin/AdminDashboard.tsx (REFACTORIZADO)
// =================================================================
import React, { useState } from 'react';
import LogoutButton from '../../components/LogoutButton';
import UserManagement from './components/UserManagement';   // <-- RUTA ACTUALIZADA
import OrderManagement from './components/OrderManagement'; // <-- RUTA ACTUALIZADA

type AdminTab = 'users' | 'orders';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const tabClasses = (tabName: AdminTab) => 
    `px-4 py-2 font-semibold rounded-t-lg transition-colors duration-200 ${activeTab === tabName ? 'bg-white text-indigo-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel de Administrador</h1>
          <p className="text-gray-600">Gestión central del sistema.</p>
        </div>
        <LogoutButton />
      </header>
      
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
          <button onClick={() => setActiveTab('users')} className={tabClasses('users')}>
            Gestión de Usuarios
          </button>
          <button onClick={() => setActiveTab('orders')} className={tabClasses('orders')}>
            Gestión de Órdenes
          </button>
        </nav>
      </div>

      <main className="p-4 bg-white rounded-b-lg rounded-r-lg shadow">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'orders' && <OrderManagement />}
      </main>
    </div>
  );
};

export default AdminDashboard;