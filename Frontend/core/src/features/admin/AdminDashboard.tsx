// =================================================================
// ARCHIVO 3: /src/features/admin/AdminDashboard.tsx (MODERNIZADO UX)
// =================================================================
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FaUsers, FaClipboardList, FaTable, FaUtensils, FaTags, FaLeaf, FaBreadSlice, FaChevronDown, FaChevronUp, FaPrint } from 'react-icons/fa';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import LogoutButton from '../../components/LogoutButton';
import StatisticsCards from './components/StatisticsCards';
import UserManagement from './components/UserManagement';
import OrderManagement from './components/OrderManagement';
import TableManagement from './components/tables/TableManagement.tsx';
import MenuManagement from './components/menu/MenuManagement.tsx';
import CategoryManagement from './components/categories/CategoryManagement.tsx';
import IngredientManagement from './components/ingredients/IngredientManagement.tsx';
import AccompanimentManagement from './components/accompaniments/AccompanimentManagement.tsx';
import StationManagement from './components/stations/StationManagement.tsx';
import PrinterManagement from './components/printers/PrinterManagement.tsx';
import DataExchangeButton from './components/shared/DataExchangeButton';
import type { RootState } from '../../app/store';

type AdminTab = 'users' | 'orders' | 'tables' | 'menu' | 'categories' | 'ingredients' | 'accompaniments' | 'stations' | 'printers';

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [showStatistics, setShowStatistics] = useState(false);
  const isDesktop = useIsDesktop();

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
    { id: 'stations', label: 'Estaciones', icon: FaUtensils, color: 'indigo' },
    { id: 'printers', label: 'Impresoras', icon: FaPrint, color: 'teal' },
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
      {/* Header con gradiente - Responsive */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 sm:gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold mb-1">
                🎯 Panel Admin
              </h1>
              <p className="text-indigo-100 text-xs sm:text-sm md:text-base hidden sm:block">
                Gestión central del sistema TurnyChain
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8">
        {/* Estadísticas Colapsables */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className="w-full bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-3 sm:p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl">📊</span>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                Estadísticas del Sistema
              </h2>
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                ({activeOrders} órdenes activas)
              </span>
            </div>
            {showStatistics ? (
              <FaChevronUp className="text-indigo-600 text-lg sm:text-xl" />
            ) : (
              <FaChevronDown className="text-gray-400 text-lg sm:text-xl" />
            )}
          </button>

          {showStatistics && (
            <div className="mt-3 sm:mt-4 animate-fadeIn">
              <StatisticsCards
                totalUsers={users.length}
                activeOrders={activeOrders}
                menuItems={menuItems.length}
                categories={categories.length}
              />
            </div>
          )}
        </div>

        {/* Tabs Navigation - Mejorado para móviles */}
        <div className="mb-4 sm:mb-6">
          {isDesktop ? (
            // Vista Desktop: Tabs horizontales
            <div className="overflow-x-auto">
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
          ) : (
            // Vista Móvil: Grid de botones con iconos grandes
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative p-3 sm:p-4 rounded-xl transition-all duration-200 shadow-md
                    ${activeTab === tab.id 
                      ? `bg-gradient-to-br from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105` 
                      : 'bg-white text-gray-700 hover:shadow-lg hover:scale-102'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <tab.icon className={`text-2xl sm:text-3xl ${activeTab === tab.id ? 'text-white' : `text-${tab.color}-500`}`} />
                    <span className="text-xs sm:text-sm font-bold text-center leading-tight">
                      {tab.label}
                    </span>
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area con animación - Mejorado para móviles */}
        <main className="bg-white rounded-xl shadow-xl p-3 sm:p-6 md:p-8 min-h-[500px] transition-all duration-300">
          {/* Indicador de sección activa - Solo móvil */}
          {!isDesktop && (
            <div className="mb-4 pb-3 border-b-2 border-gray-200">
              <div className="flex items-center gap-2">
                {tabs.find(t => t.id === activeTab)?.icon &&
                  React.createElement(tabs.find(t => t.id === activeTab)!.icon, {
                    className: `text-2xl text-${tabs.find(t => t.id === activeTab)!.color}-600`
                  })
                }
                <h3 className="text-lg font-bold text-gray-800">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
              </div>
            </div>
          )}

          <div className="animate-fadeIn">
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'orders' && <OrderManagement />}
            {activeTab === 'tables' && <TableManagement />}
            {activeTab === 'menu' && <MenuManagement />}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'ingredients' && <IngredientManagement />}
            {activeTab === 'accompaniments' && <AccompanimentManagement />}
            {activeTab === 'stations' && <StationManagement />}
            {activeTab === 'printers' && <PrinterManagement />}
          </div>
        </main>
      </div>

      {/* 🆕 Botón Flotante para Importar/Exportar Datos */}
      <DataExchangeButton />
    </div>
  );
};

export default AdminDashboard;