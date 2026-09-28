import React, { useState } from 'react';
import { AttendanceNotebookModal } from '../../cashier/components/cashierDashboardShared/AttendanceNotebookModal';
import AttendanceAdminManagement from '../../admin/components/attendance/AttendanceAdminManagement';
import type { AttendanceReport } from '../../cashier/api/attendanceApi';

interface ManagerAttendancePanelProps {
  reports: AttendanceReport[];
}

export const ManagerAttendancePanel: React.FC<ManagerAttendancePanelProps> = ({ reports }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const exportCsv = () => {
    const rows = reports.map(report => [
      report.name,
      report.role,
      report.days_worked,
      report.days_rest,
      report.days_absent,
      report.liquidation_days,
    ]);
    const csv = [['Empleado', 'Rol', 'Trabajados', 'Descansos', 'No trabajados', 'Liquidacion'], ...rows]
      .map(row => row.join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `asistencias-gerente-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Equipo</p>
          <h2 className="text-2xl font-black text-slate-900">Asistencias y liquidaciones</h2>
          <p className="text-sm text-slate-500">Consulta el historial por rango y revisa el calendario de cada empleado.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Exportar CSV</button>
          <button onClick={() => window.print()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Generar PDF</button>
          <button onClick={() => setIsHistoryOpen(true)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700">Abrir historial</button>
          <button onClick={() => setIsEditorOpen(current => !current)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">{isEditorOpen ? 'Cerrar edición' : 'Editar registros'}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Trabajados" value={reports.reduce((sum, item) => sum + item.days_worked, 0)} />
        <Metric label="Descansos" value={reports.reduce((sum, item) => sum + item.days_rest, 0)} />
        <Metric label="No trabajados" value={reports.reduce((sum, item) => sum + item.days_absent, 0)} />
        <Metric label="Liquidables" value={reports.reduce((sum, item) => sum + item.liquidation_days, 0)} />
      </div>
      <AttendanceNotebookModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      {isEditorOpen && <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4"><AttendanceAdminManagement /></div>}
    </section>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p className="text-xl font-black text-slate-900">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
  </div>
);
