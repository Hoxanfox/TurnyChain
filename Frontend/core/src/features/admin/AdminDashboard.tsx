// =================================================================
// ARCHIVO 7: /src/features/admin/AdminDashboard.tsx (ACTUALIZADO)
// =================================================================
import React, { useState } from 'react';
import LogoutButton from '../../components/LogoutButton';
import UserManagement from './components/UserManagement';
import OrderManagement from './components/OrderManagement';
import TableManagement from './components/TableManagement'; // <-- NUEVO
import MenuManagement from './components/MenuManagement';   // <-- NUEVO

type AdminTab = 'users' | 'orders' | 'tables' | 'menu';

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
          <button onClick={() => setActiveTab('users')} className={tabClasses('users')}>Usuarios</button>
          <button onClick={() => setActiveTab('orders')} className={tabClasses('orders')}>Órdenes</button>
          <button onClick={() => setActiveTab('tables')} className={tabClasses('tables')}>Mesas</button>
          <button onClick={() => setActiveTab('menu')} className={tabClasses('menu')}>Menú</button>
        </nav>
      </div>

      <main className="p-4 bg-white rounded-b-lg rounded-r-lg shadow">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'tables' && <TableManagement />}
        {activeTab === 'menu' && <MenuManagement />}
      </main>
    </div>
  );
};

export default AdminDashboard;