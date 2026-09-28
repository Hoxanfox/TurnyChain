import React from 'react';
import EmployeeManagement from '../../admin/components/employees/EmployeeManagement';
import InventoryReceiptPage from '../../inventory/InventoryReceiptPage';
import type { ManagerModule } from '../domain/managerModules';
import type { AttendanceReport } from '../../cashier/api/attendanceApi';
import { ManagerAttendancePanel } from './ManagerAttendancePanel';

interface ManagerModuleContentProps {
  activeModule: ManagerModule;
  reports: AttendanceReport[];
}

export const ManagerModuleContent: React.FC<ManagerModuleContentProps> = ({ activeModule, reports }) => {
  if (activeModule === 'attendance') return <ManagerAttendancePanel reports={reports} />;
  if (activeModule === 'employees') return <EmployeeManagement />;
  if (activeModule === 'inventory') return <InventoryReceiptPage />;

  const worked = reports.reduce((sum, report) => sum + report.days_worked, 0);
  const rest = reports.reduce((sum, report) => sum + report.days_rest, 0);
  const liquidation = reports.reduce((sum, report) => sum + report.liquidation_days, 0);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Vista de gerente</p>
        <h2 className="mt-1 text-2xl font-black text-slate-900">
          {activeModule === 'reports' ? 'Métricas de operación' : 'Resumen de la jornada'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">Datos de asistencias de los últimos siete días.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Personal con registros" value={reports.length} tone="emerald" />
        <SummaryCard label="Días trabajados" value={worked} tone="sky" />
        <SummaryCard label="Días de descanso" value={rest} tone="violet" />
        <SummaryCard label="Días liquidables" value={liquidation} tone="amber" />
      </div>
    </section>
  );
};

const SummaryCard = ({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'sky' | 'violet' | 'amber' }) => (
  <div className={`rounded-2xl border p-4 ${
    tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' :
      tone === 'sky' ? 'border-sky-100 bg-sky-50' :
        tone === 'violet' ? 'border-violet-100 bg-violet-50' : 'border-amber-100 bg-amber-50'
  }`}>
    <p className="text-3xl font-black text-slate-900">{value}</p>
    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
  </div>
);
