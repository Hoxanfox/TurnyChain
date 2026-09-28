import React from 'react';
import LogoutButton from '../../../components/LogoutButton';
import { ManagerModuleContent } from './ManagerModuleContent';
import { managerModules, type ManagerModule } from '../domain/managerModules';
import type { AttendanceReport } from '../../cashier/api/attendanceApi';

interface ManagerDashboardDesktopProps {
  activeModule: ManagerModule;
  onModuleChange: (module: ManagerModule) => void;
  reports: AttendanceReport[];
}

export const ManagerDashboardDesktop: React.FC<ManagerDashboardDesktopProps> = ({ activeModule, onModuleChange, reports }) => (
  <div className="min-h-screen bg-[#f0effb] text-slate-900">
    <div className="mx-auto grid min-h-screen max-w-[1480px] grid-cols-[224px_1fr] gap-0 bg-[#f8f8fd] shadow-2xl">
      <aside className="flex flex-col bg-gradient-to-b from-[#6752b8] via-[#7258c5] to-[#4c3c97] px-3 py-6 text-white">
        <div className="mb-10 flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-black shadow-inner">T</div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-100">TurnyChain</p><h1 className="text-sm font-black">Manager OS</h1></div>
        </div>
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">Workspace</p>
        <nav className="space-y-1">
          {managerModules.map(module => (
            <button key={module.id} onClick={() => onModuleChange(module.id)} className={`w-full rounded-xl px-3 py-3 text-left transition ${activeModule === module.id ? 'bg-white/20 text-white shadow-lg' : 'text-violet-100 hover:bg-white/10'}`}>
              <span className="mr-3 text-lg">{module.icon}</span>
              <span className="font-bold">{module.label}</span>
              <span className="mt-1 block pl-7 text-[11px] text-violet-200">{module.description}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-black/10 p-3 text-xs text-violet-100">
          <p className="font-bold">Vista operativa</p>
          <p className="mt-1 text-violet-200">Datos del equipo y del negocio en un solo lugar.</p>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">Resumen de operación</p><h2 className="mt-1 text-2xl font-black tracking-tight">Panel de Gerente</h2></div>
          <LogoutButton />
        </header>
        <main className="min-w-0 p-8"><ManagerModuleContent activeModule={activeModule} reports={reports} /></main>
      </section>
    </div>
  </div>
);
