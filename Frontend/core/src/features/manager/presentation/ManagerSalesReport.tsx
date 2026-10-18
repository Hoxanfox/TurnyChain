import React from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useManagerSales } from '../application/useManagerSales';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const money = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;
const compactMoney = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `$${Math.round(value / 1_000)}k` : `$${Math.round(value)}`;
const monthLabel = (value: string) => { const [year, month] = value.split('-'); return `${MONTHS[Number(month) - 1] ?? month} ${year.slice(2)}`; };
const dayLabel = (value: string) => value.split('-')[2] || value;
const longDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

export const ManagerSalesReport: React.FC = () => {
  const { dailyData, monthlyData, yearlyData, selectedMonth, setSelectedMonth, summary, isLoading, error, refresh } = useManagerSales();
  const latestMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(new Date());

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">Reportes</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Ventas por periodo</h2>
          <p className="mt-1 text-sm text-slate-500">Montos agrupados en horario de Bogotá para evitar desfases de UTC.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="sales-month">Mes</label>
          <input id="sales-month" type="month" value={selectedMonth} max={latestMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700" />
          <button onClick={refresh} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Actualizar</button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Mes seleccionado" value={money(summary.month)} subtitle={`${summary.monthOrders} órdenes`} tone="violet" />
        <Kpi label="Ventas del día" value={money(summary.today)} subtitle={`${summary.todayOrders} órdenes`} tone="emerald" />
        <Kpi label="Ticket promedio" value={money(summary.averageTicket)} subtitle="Por orden pagada" tone="sky" />
        <Kpi label="Mejor día" value={summary.bestDay ? money(summary.bestDay.total) : '$0'} subtitle={summary.bestDay ? longDate(summary.bestDay.date) : 'Sin ventas'} tone="amber" />
      </div>

      <ChartCard eyebrow="Detalle del mes" title={`Ventas diarias · ${monthLabel(selectedMonth)}`} loading={isLoading}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs><linearGradient id="dailySalesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.32} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tickFormatter={compactMoney} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
            <Tooltip labelFormatter={(label) => longDate(String(label))} formatter={(value: any, _name: any, item: any) => [`${money(Number(value))} · ${item?.payload?.order_count ?? 0} órdenes`, 'Ventas']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(15,23,42,.12)' }} />
            <Area type="monotone" dataKey="total" stroke="#059669" strokeWidth={2.5} fill="url(#dailySalesGradient)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard eyebrow="Últimos 12 meses" title="Comparativo mensual" loading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compactMoney} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={58} />
              <Tooltip labelFormatter={(label) => monthLabel(String(label))} formatter={(value: any, _name: any, item: any) => [`${money(Number(value))} · ${item?.payload?.order_count ?? 0} órdenes`, 'Ventas']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(15,23,42,.12)' }} />
              <Bar dataKey="total" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard eyebrow="Tendencia histórica" title="Ventas por año" loading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearlyData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compactMoney} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={58} />
              <Tooltip formatter={(value: any, _name: any, item: any) => [`${money(Number(value))} · ${item?.payload?.order_count ?? 0} órdenes`, 'Ventas']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(15,23,42,.12)' }} />
              <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
};

const ChartCard = ({ eyebrow, title, loading, children }: { eyebrow: string; title: string; loading: boolean; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p><h3 className="mt-1 text-lg font-bold text-slate-800">{title}</h3></div>
    <div className="h-[300px] w-full">{loading ? <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">Cargando ventas...</div> : children}</div>
  </section>
);

const Kpi = ({ label, value, subtitle, tone }: { label: string; value: string; subtitle: string; tone: 'violet' | 'emerald' | 'sky' | 'amber' }) => (
  <div className={`rounded-2xl border p-4 ${tone === 'violet' ? 'border-violet-100 bg-violet-50' : tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' : tone === 'sky' ? 'border-sky-100 bg-sky-50' : 'border-amber-100 bg-amber-50'}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p></div>
);
