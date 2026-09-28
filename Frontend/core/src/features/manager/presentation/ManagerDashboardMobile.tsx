import React from 'react';
import { ManagerModuleContent } from './ManagerModuleContent';
import { managerModules, type ManagerModule } from '../domain/managerModules';
import type { AttendanceReport } from '../../cashier/api/attendanceApi';
import LogoutButton from '../../../components/LogoutButton';
import { useState } from 'react';

interface ManagerDashboardMobileProps {
  activeModule: ManagerModule;
  onModuleChange: (module: ManagerModule) => void;
  reports: AttendanceReport[];
}

export const ManagerDashboardMobile: React.FC<ManagerDashboardMobileProps> = ({ activeModule, onModuleChange, reports }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-900">
      <header className="flex items-center justify-between bg-gradient-to-br from-[#6752b8] to-[#4c3c97] px-5 pb-5 pt-7 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">TurnyChain / Manager OS</p>
          <h1 className="mt-1 text-2xl font-black">Panel de Gerente</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xl" aria-label="Abrir herramientas">☰</button>
      </header>
      <main className="px-4 py-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ManagerModuleContent activeModule={activeModule} reports={reports} />
        </section>
      </main>
      {isSidebarOpen && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/50" onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar menú" />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-[86%] max-w-sm flex-col bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Herramientas</p><h2 className="text-xl font-black">Perfil gerente</h2></div>
              <button onClick={() => setIsSidebarOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2" aria-label="Cerrar menú">×</button>
            </div>
            <nav className="flex-1 space-y-2 py-5">
              {managerModules.map(module => (
                <button key={module.id} onClick={() => { onModuleChange(module.id); setIsSidebarOpen(false); }} className={`w-full rounded-xl px-4 py-3 text-left ${activeModule === module.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}>
                  <span className="mr-3">{module.icon}</span><span className="font-bold">{module.label}</span>
                  <span className="mt-1 block pl-7 text-xs opacity-60">{module.description}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-slate-100 pt-4"><LogoutButton /></div>
          </aside>
        </>
      )}
    </div>
  );
};
