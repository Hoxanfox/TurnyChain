// =================================================================
// ARCHIVO 3: /src/features/admin/AdminDashboard.tsx (MODERNIZADO)
// =================================================================
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FaUsers, FaClipboardList, FaTable, FaUtensils, FaTags, FaLeaf, FaBreadSlice } from 'react-icons/fa';
import LogoutButton from '../../components/LogoutButton';
import StatisticsCards from './components/StatisticsCards';
import UserManagement from './components/UserManagement';
import OrderManagement from './components/OrderManagement';
import TableManagement from './components/tables/TableManagement.tsx';
import MenuManagement from './components/menu/MenuManagement.tsx';
import CategoryManagement from './components/categories/CategoryManagement.tsx';
import IngredientManagement from './components/ingredients/IngredientManagement.tsx';
import AccompanimentManagement from './components/accompaniments/AccompanimentManagement.tsx';
import type { RootState } from '../../app/store';

type AdminTab = 'users' | 'orders' | 'tables' | 'menu' | 'categories' | 'ingredients' | 'accompaniments';

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Obtener estadísticas del store
  const users = useSelector((state: RootState) => state.users?.users || []);
  const menuItems = useSelector((state: RootState) => state.menu?.items || []);
  const categories = useSelector((state: RootState) => state.categories?.items || []);
  const myOrders = useSelector((state: RootState) => state.orders?.myOrders || []);

  const tabs: TabConfig[] = [
    { id: 'users', label: 'Usuarios', icon: FaUsers, color: 'blue' },
    { id: 'orders', label: 'Órdenes', icon: FaClipboardList, color: 'green' },
    { id: 'tables', label: 'Mesas', icon: FaTable, color: 'purple' },
    { id: 'menu', label: 'Menú', icon: FaUtensils, color: 'red' },
    { id: 'categories', label: 'Categorías', icon: FaTags, color: 'orange' },
    { id: 'ingredients', label: 'Ingredientes', icon: FaLeaf, color: 'lime' },
    { id: 'accompaniments', label: 'Acompañantes', icon: FaBreadSlice, color: 'amber' },
  ];

  const getTabClasses = (tab: TabConfig) => {
    const isActive = activeTab === tab.id;
    return `
      group relative px-5 py-3 font-medium rounded-t-lg transition-all duration-300
      ${isActive 
        ? `bg-white text-${tab.color}-600 shadow-lg border-b-4 border-${tab.color}-600` 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }
    `;
  };

  const activeOrders = myOrders.filter((order) =>
    order.status === 'pending' || order.status === 'confirmed'
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header con gradiente */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                🎯 Panel de Administrador
              </h1>
              <p className="text-indigo-100 text-sm md:text-base">
                Gestión central del sistema TurnyChain
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjetas de Estadísticas */}
        <StatisticsCards
          totalUsers={users.length}
          activeOrders={activeOrders}
          menuItems={menuItems.length}
          categories={categories.length}
        />

        {/* Tabs Navigation */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={getTabClasses(tab)}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className={`text-lg ${activeTab === tab.id ? `text-${tab.color}-600` : 'text-gray-500'}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area con animación */}
        <main className="bg-white rounded-xl shadow-xl p-6 md:p-8 min-h-[500px] transition-all duration-300">
          <div className="animate-fadeIn">
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'orders' && <OrderManagement />}
            {activeTab === 'tables' && <TableManagement />}
            {activeTab === 'menu' && <MenuManagement />}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'ingredients' && <IngredientManagement />}
            {activeTab === 'accompaniments' && <AccompanimentManagement />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;