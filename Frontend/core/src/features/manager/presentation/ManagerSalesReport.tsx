import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useManagerSales } from '../application/useManagerSales';

const RANGES: { label: string; days: number }[] = [
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '12 meses', days: 365 },
];

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatMoney = (value: number) => `$${Math.round(value).toLocaleString('es-CO')}`;

const formatMoneyCompact = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
};

const formatDayTick = (value: string) => {
  const [, month, day] = value.split('-');
  return `${day} ${MONTHS_SHORT[Number(month) - 1] ?? ''}`;
};

const formatDayLong = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const ManagerSalesReport: React.FC = () => {
  const [days, setDays] = useState(365);
  const { data, summary, isLoading, error, refresh } = useManagerSales(days);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">Reportes</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Ventas diarias</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresos por órdenes pagadas. Cierre de cada día en horario de Bogotá.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {RANGES.map(range => (
              <button
                key={range.days}
                onClick={() => setDays(range.days)}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                  days === range.days ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={refresh} className="font-bold hover:underline">
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Ventas de hoy" value={formatMoney(summary.today)} subtitle={`${summary.todayOrders} órdenes`} tone="violet" />
        <KpiCard label="Este mes" value={formatMoney(summary.month)} subtitle={`${summary.monthOrders} órdenes`} tone="emerald" />
        <KpiCard label="Ticket promedio" value={formatMoney(summary.averageTicket)} subtitle="Por orden pagada" tone="sky" />
        <KpiCard label={`Total ${days === 365 ? '12 meses' : `${days} días`}`} value={formatMoney(summary.total)} subtitle={`${summary.totalOrders} órdenes`} tone="amber" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Evolución</p>
            <h3 className="text-lg font-bold text-slate-800">Ventas por día</h3>
          </div>
          {summary.bestDay && (
            <p className="text-xs font-semibold text-slate-500">
              Mejor día: <span className="text-slate-800">{formatDayLong(summary.bestDay.date)}</span> ·{' '}
              <span className="text-emerald-600">{formatMoney(summary.bestDay.total)}</span>
            </p>
          )}
        </div>

        <div className="h-[360px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
              Cargando ventas...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDayTick}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={formatMoneyCompact}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={label => formatDayLong(String(label))}
                  formatter={(value: any, _name: any, item: any) => [
                    `${formatMoney(value)} · ${item?.payload?.order_count ?? 0} órdenes`,
                    'Ventas',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
};

const KpiCard = ({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  tone: 'violet' | 'emerald' | 'sky' | 'amber';
}) => (
  <div
    className={`rounded-2xl border p-4 ${
      tone === 'violet'
        ? 'border-violet-100 bg-violet-50'
        : tone === 'emerald'
          ? 'border-emerald-100 bg-emerald-50'
          : tone === 'sky'
            ? 'border-sky-100 bg-sky-50'
            : 'border-amber-100 bg-amber-50'
    }`}
  >
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    <p className="mt-1 text-[11px] font-semibold text-slate-400">{subtitle}</p>
  </div>
);
