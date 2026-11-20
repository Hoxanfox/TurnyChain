import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import MenuManagement from '../admin/components/menu/MenuManagement';
import CategoryManagement from '../admin/components/categories/CategoryManagement';
import IngredientManagement from '../admin/components/ingredients/IngredientManagement';
import AccompanimentManagement from '../admin/components/accompaniments/AccompanimentManagement';
import StationManagement from '../admin/components/stations/StationManagement';
import PrinterManagement from '../admin/components/printers/PrinterManagement';

type MenuTool =
  | 'menu'
  | 'categories'
  | 'ingredients'
  | 'accompaniments'
  | 'stations'
  | 'printers';

const tools: Array<{ id: MenuTool; icon: string; label: string; description: string }> = [
  { id: 'menu', icon: '🍽️', label: 'Productos', description: 'Crear y editar el menú' },
  { id: 'categories', icon: '🏷️', label: 'Categorías', description: 'Organizar productos' },
  { id: 'ingredients', icon: '🥬', label: 'Ingredientes', description: 'Opciones removibles' },
  { id: 'accompaniments', icon: '🍟', label: 'Acompañantes', description: 'Extras del menú' },
  { id: 'stations', icon: '📍', label: 'Estaciones', description: 'Zonas de preparación' },
  { id: 'printers', icon: '🖨️', label: 'Impresoras', description: 'Conectar estaciones' },
];

const CashierMenuToolsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState<MenuTool>('menu');

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 rounded-2xl bg-gradient-to-r from-indigo-700 to-purple-700 p-4 text-white shadow-lg sm:p-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mb-3 flex items-center gap-2 text-sm font-bold text-indigo-100"
          >
            <FiArrowLeft /> Volver al cajero
          </button>
          <h1 className="text-2xl font-black sm:text-3xl">Configuración del menú</h1>
          <p className="mt-1 text-sm text-indigo-100">
            Todo lo necesario para mantener productos e ingredientes actualizados.
          </p>
        </header>

        <nav className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
          {tools.map(tool => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`rounded-xl p-3 text-left transition ${
                activeTool === tool.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-xl">{tool.icon}</span>
              <span className="mt-1 block text-sm font-black">{tool.label}</span>
              <span className={`hidden text-[11px] sm:block ${activeTool === tool.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                {tool.description}
              </span>
            </button>
          ))}
        </nav>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          {activeTool === 'menu' && <MenuManagement />}
          {activeTool === 'categories' && <CategoryManagement />}
          {activeTool === 'ingredients' && <IngredientManagement />}
          {activeTool === 'accompaniments' && <AccompanimentManagement />}
          {activeTool === 'stations' && <StationManagement />}
          {activeTool === 'printers' && <PrinterManagement />}
        </section>
      </div>
    </main>
  );
};

export default CashierMenuToolsPage;
